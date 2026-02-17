import { getBackendUrl } from '../utils/Helper';
import enhanceedStorage from '../utils/enhanceedStorage';
import log from '../utils/logger';

// Error types for better handling
export const AUTH_ERRORS = {
  NO_TOKENS: 'NO_TOKENS',
  REFRESH_FAILED: 'REFRESH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
};

// Custom error class for authentication errors
export class AuthError extends Error {
  constructor(type, message) {
    super(message);
    this.type = type;
    this.name = 'AuthError';
  }
}

class ApiService {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay
    this.authCallback = null; // Callback to handle auth failures
  }

  /**
     * Set a callback to handle authentication failures
     * This should be called from the AuthContext to handle signOut
     */
  setAuthFailureCallback(callback) {
    this.authCallback = callback;
  }

  /**
     * Process the failed queue after successful token refresh
     */
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
     * Check if user has valid authentication tokens
     */
  hasValidTokens() {
    const accessToken = enhanceedStorage.getAuthToken();
    const refreshToken = enhanceedStorage.getRefreshToken();
    return !!(accessToken && refreshToken);
  }

  /**
     * Handle complete authentication failure - redirect to login
     */
  async handleAuthenticationFailure(reason = 'Authentication failed') {
    log.error(`Authentication failure: ${reason}`);

    // Clear all auth data
    enhanceedStorage.clearAuthData();

    // Call auth failure callback if set (usually signOut from AuthContext)
    if (this.authCallback) {
      try {
        await this.authCallback();
      } catch (error) {
        log.error('Error in auth failure callback:', error);
      }
    }

    throw new AuthError(AUTH_ERRORS.NO_TOKENS, reason);
  }

  /**
     * Refresh the authentication token
     */
  async refreshAuthToken() {
    if (this.isRefreshing) {
      // If already refreshing, wait for the current refresh to complete
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const accessToken = enhanceedStorage.getAuthToken();
      const refreshToken = enhanceedStorage.getRefreshToken();

      // Check if both tokens are missing
      if (!accessToken && !refreshToken) {
        await this.handleAuthenticationFailure('No access token or refresh token available');
        return;
      }

      // Check if only refresh token is missing
      if (!refreshToken) {
        await this.handleAuthenticationFailure('No refresh token available for token refresh');
        return;
      }

      const tokenResponse = await fetch(getBackendUrl('/token/refresh'), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (tokenResponse.status === 200) {
        const { token } = await tokenResponse.json();
        enhanceedStorage.updateAuthToken(token);
        this.processQueue(null, token);
        log.info('Token refreshed successfully');
        return token;
      } else if (tokenResponse.status === 401 || tokenResponse.status === 403) {
        // Refresh token is invalid or expired
        await this.handleAuthenticationFailure(`Refresh token invalid or expired (status: ${tokenResponse.status})`);
        return;
      } else {
        throw new AuthError(AUTH_ERRORS.REFRESH_FAILED, `Token refresh failed with status ${tokenResponse.status}`);
      }
    } catch (error) {
      log.error('Token refresh failed:', error);
      this.processQueue(error, null);

      // If it's an authentication error, handle it appropriately
      if (error instanceof AuthError && error.type === AUTH_ERRORS.NO_TOKENS) {
        throw error; // Re-throw auth errors
      }

      // For other errors (network, server), clear auth data and fail
      await this.handleAuthenticationFailure(`Token refresh error: ${error.message}`);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
     * Handle token-related errors and retry if possible
     */
  async handleTokenError(originalRequest, attempt = 0) {
    if (attempt >= this.maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    try {
      const newToken = await this.refreshAuthToken();

      // Update the authorization header and retry
      originalRequest.headers = {
        ...originalRequest.headers,
        'Authorization': `Bearer ${newToken}`,
      };

      return this.executeRequest(originalRequest, attempt + 1);
    } catch (error) {
      log.error('Failed to refresh token and retry request:', error);
      throw error;
    }
  }

  /**
     * Execute HTTP request with retry logic
     */
  async executeRequest(requestConfig, attempt = 0) {
    // Only check for tokens if this is an authenticated request
    // (has Authorization header with Bearer token)
    if (requestConfig.headers &&
            requestConfig.headers.Authorization &&
            requestConfig.headers.Authorization.startsWith('Bearer ')) {

      if (!this.hasValidTokens()) {
        await this.handleAuthenticationFailure('No valid tokens available for authenticated request');
        return;
      }
    }

    try {
      const { url, method, headers = {}, body } = requestConfig;

      const fetchOptions = {
        method,
        headers: {
          'Accept': 'application/json',
          ...headers,
        },
      };
      log.info(`fetchOptions for ${method} ${url}:`, fetchOptions);

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, fetchOptions);

      // Check for token-related errors
      if (response.status === 401 || response.status === 498) {
        log.warn(`Token error (${response.status}) detected, attempting refresh and retry`);
        return this.handleTokenError(requestConfig, attempt);
      }

      // Handle other client errors (4xx) - don't retry
      if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 498) {
        const errorText = await response.text();
        throw new Error(`Client error ${response.status}: ${errorText}`);
      }

      // Handle server errors (5xx) - retry with exponential backoff
      if (response.status >= 500) {
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          log.warn(`Server error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeRequest(requestConfig, attempt + 1);
        } else {
          const errorText = await response.text();
          throw new Error(`Server error ${response.status} after ${this.maxRetries} attempts: ${errorText}`);
        }
      }

      // Success - parse response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      return { status: response.status, response: responseData };

    } catch (error) {
      // Network errors or other non-HTTP errors - retry with exponential backoff
      if (attempt < this.maxRetries && !error.message.includes('Client error')) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        log.warn(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${this.maxRetries}):`, error);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest(requestConfig, attempt + 1);
      }

      log.error('Request failed after retries:', error);
      throw error;
    }
  }

  /**
     * GET request with retry capabilities
     */
  async get(url, headers = {}) {
    return this.executeRequest({ url, method: 'GET', headers });
  }

  /**
     * POST request with retry capabilities
     */
  async post(url, body = {}, headers = {}) {
    return this.executeRequest({ url, method: 'POST', headers, body });
  }

  /**
     * PUT request with retry capabilities
     */
  async put(url, body = {}, headers = {}) {
    return this.executeRequest({ url, method: 'PUT', headers, body });
  }

  /**
     * DELETE request with retry capabilities
     */
  async delete(url, headers = {}) {
    return this.executeRequest({ url, method: 'DELETE', headers });
  }

  /**
     * PATCH request with retry capabilities
     */
  async patch(url, body = {}, headers = {}) {
    return this.executeRequest({ url, method: 'PATCH', headers, body });
  }
}

export default new ApiService();