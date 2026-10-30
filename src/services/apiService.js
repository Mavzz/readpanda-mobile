/* global AbortController */ // provided by React Native, missing from eslint's env
import { Alert } from 'react-native';
import { getBackendUrl } from '../utils/Helper';
import enhancedStorage from '../utils/enhancedStorage';
import log from '../utils/logger';
import { OfflineError, isNetworkError } from '../utils/apiError';
import { isOnline, recheckConnectivity, confirmOnline, takeProbe, reportNoAnswer } from '../stores/connectivityStore';
import { showOfflineToast } from '../components/Toaster';
import { accountFrom } from '../utils/account';

// Past this a request is given up on and counts as a network error, so a
// connection that hangs rather than fails still reaches the retry and the
// outbox (specs/offline-first R1.3).
const REQUEST_TIMEOUT = 15000;

// Error types for better handling
export const AUTH_ERRORS = {
  NO_TOKENS: 'NO_TOKENS',
  REFRESH_FAILED: 'REFRESH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
};

// What a suspended reader is told as they're signed out (report-block R10.2).
export const SUSPENDED_MESSAGE =
  'Your account has been suspended. Email readpanda.support@gmail.com if you think this is a mistake.';

const isSuspended = (status, bodyText) => {
  if (status !== 403) {
    return false;
  }
  try {
    return JSON.parse(bodyText)?.code === 'account_suspended';
  } catch {
    return false;
  }
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
    this.timeout = REQUEST_TIMEOUT;
    this.authCallback = null; // Callback to handle auth failures
    // Set while the suspended alert is up, so several calls failing at once
    // show it once.
    this.suspendedShown = false;
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
    const accessToken = enhancedStorage.getAuthToken();
    const refreshToken = enhancedStorage.getRefreshToken();
    return !!(accessToken && refreshToken);
  }

  /**
     * Handle complete authentication failure - redirect to login
     */
  async handleAuthenticationFailure(reason = 'Authentication failed') {
    log.error(`Authentication failure: ${reason}`);

    // Clear all auth data
    enhancedStorage.clearAuthData();

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
     * The API says this account is suspended (report-block R10): sign out and
     * say why, once however many calls were refused. Sign-in screens get the
     * same alert, so they skip their own message for it.
     */
  async handleSuspended() {
    if (this.suspendedShown) {
      return;
    }
    this.suspendedShown = true;
    log.warn('Account suspended; signing out');
    enhancedStorage.clearAuthData();
    if (this.authCallback) {
      try {
        await this.authCallback();
      } catch (error) {
        log.error('Error in auth failure callback:', error);
      }
    }
    Alert.alert('Account suspended', SUSPENDED_MESSAGE, [
      { text: 'OK', onPress: () => { this.suspendedShown = false; } },
    ], { onDismiss: () => { this.suspendedShown = false; } });
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
      const accessToken = enhancedStorage.getAuthToken();
      const refreshToken = enhancedStorage.getRefreshToken();

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
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      if (tokenResponse.status === 200) {
        const refreshed = await tokenResponse.json();
        const { accessToken, refreshToken: rotatedRefreshToken } = refreshed;
        enhancedStorage.updateAuthToken(accessToken);
        // Required here, not imported: the auth store imports services that
        // import this one.
        require('../stores/authStore').default.getState().adoptAccount(accountFrom(refreshed));
        // The backend rotates the refresh token on every use — persist the
        // new one so the next refresh doesn't fail against a stale value.
        if (rotatedRefreshToken) {
          enhancedStorage.updateRefreshToken(rotatedRefreshToken);
        }
        this.processQueue(null, accessToken);
        log.info('Token refreshed successfully');
        return accessToken;
      } else if (tokenResponse.status === 401 || tokenResponse.status === 403) {
        const bodyText = await tokenResponse.text().catch(() => '');
        if (isSuspended(tokenResponse.status, bodyText)) {
          await this.handleSuspended();
          throw new AuthError(AUTH_ERRORS.NO_TOKENS, 'Account suspended');
        }
        // Refresh token is invalid or expired
        await this.handleAuthenticationFailure(`Refresh token invalid or expired (status: ${tokenResponse.status})`);
        return;
      } else {
        throw new AuthError(AUTH_ERRORS.REFRESH_FAILED, `Token refresh failed with status ${tokenResponse.status}`);
      }
    } catch (error) {
      log.error('Token refresh failed:', error);
      this.processQueue(error, null);

      // Only clear auth data for genuine auth failures (NO_TOKENS already handled above)
      if (error instanceof AuthError) {
        throw error; // Re-throw without clearing auth data
      }

      // For unexpected errors (network, wrong method, etc.), preserve tokens and throw
      throw new AuthError(AUTH_ERRORS.REFRESH_FAILED, `Token refresh error: ${error.message}`);
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
    // A caller can ask for fewer retries (maxRetries: 0) when someone is
    // waiting on the answer.
    const maxRetries = requestConfig.maxRetries ?? this.maxRetries;

    // Offline, a request can only fail, so fail now rather than after the
    // backoff. Checked on every attempt: a connection lost between retries
    // ends them too. A write the reader made gets the offline toast unless
    // the caller (the outbox) handles it quietly; a read just falls back to
    // what the screen has cached.
    //
    // "Offline" can be a stale reading (a missed reconnect, or the Simulator
    // reporting no network that isn't gone), so it's checked again, and every
    // few seconds a request goes out anyway as a probe: an answer puts the app
    // back online (connectivityStore). Any request, writes included, or a
    // screen that only writes (signing in) could never find out; only first
    // attempts, so the probe is the request's one try. With truly no network
    // it fails at once and the retry below is refused as offline, toast and
    // all.
    if (!isOnline()) {
      recheckConnectivity();
      const probe = attempt === 0 && takeProbe();
      if (!probe) {
        if (requestConfig.method !== 'GET' && !requestConfig.quiet) {
          showOfflineToast();
        }
        throw new OfflineError(`Offline: ${requestConfig.method} ${requestConfig.url}`);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      const { url, method, headers = {}, body } = requestConfig;

      const fetchOptions = {
        signal: controller.signal,
        method,
        headers: {
          'Accept': 'application/json',
          'X-Application-Type': 'mobile',
          ...headers,
        },
      };
      if (__DEV__) {
        const { Authorization, ...safeHeaders } = fetchOptions.headers || {};
        log.info(`fetchOptions for ${method} ${url}:`, { ...fetchOptions, headers: safeHeaders });
      }

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, fetchOptions);
      // Any answer at all means there's a connection.
      confirmOnline();

      // skipAuthRetry marks requests that never carried one of our own JWTs
      // to begin with (login/signup/Google auth) — a 401/498 there means
      // "these credentials/this token are invalid", not "our access token
      // expired", so refreshing our app token and retrying can't help and
      // only masks the real error (or, if a stale app session happens to
      // exist, actively breaks the request by swapping in the wrong
      // Authorization header). Treat it as a plain non-retryable 4xx instead.
      const isAuthError = response.status === 401 || response.status === 498;
      if (isAuthError && !requestConfig.skipAuthRetry) {
        log.warn(`Token error (${response.status}) detected, attempting refresh and retry`);
        return this.handleTokenError(requestConfig, attempt);
      }

      // Handle other client errors (4xx) - don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        const error = new Error(`Client error ${response.status}: ${errorText}`);
        if (isSuspended(response.status, errorText)) {
          error.suspended = true;
          await this.handleSuspended();
        }
        throw error;
      }

      // Handle server errors (5xx) - retry with exponential backoff
      if (response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          log.warn(`Server error (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);

          await new Promise(resolve => setTimeout(resolve, delay));
          return this.executeRequest(requestConfig, attempt + 1);
        } else {
          const errorText = await response.text();
          throw new Error(`Server error ${response.status} after ${maxRetries} attempts: ${errorText}`);
        }
      }

      if (response.status === 204) {
        log.info('Request successful');
        return { status: response.status, response: null };
      }

      // Success - parse response
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      return { status: response.status, response: responseData };

    } catch (caught) {
      // Named for what happened: "Aborted" said nothing about which request
      // or why.
      let error = caught;
      if (caught?.name === 'AbortError') {
        error = new Error(`Timed out after ${this.timeout / 1000}s: ${requestConfig.method} ${requestConfig.url}`);
        error.name = 'TimeoutError';
        error.timeout = true;
      }
      // Sent, and no answer: the network may be up but going nowhere (R1.6).
      if (isNetworkError(error) && !error.offline) {
        reportNoAnswer();
      }
      // Network errors or other non-HTTP errors - retry with exponential
      // backoff. Not a timeout: it already waited longer than a retry would,
      // and four in a row kept a screen waiting a minute (R1.3).
      if (attempt < maxRetries && !error.offline && !error.timeout && !error.message.includes('Client error')) {
        const delay = this.retryDelay * Math.pow(2, attempt);
        log.warn(`Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, error);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeRequest(requestConfig, attempt + 1);
      }

      // No answer is expected offline or on a bad network; the caller
      // decides what it means. A server that answered badly is an error.
      if (isNetworkError(error)) {
        log.warn('Request got no answer:', error.message);
      } else {
        log.error('Request failed after retries:', error);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
     * GET request with retry capabilities.
     * options: { skipAuthRetry, maxRetries, quiet } — see executeRequest.
     */
  async get(url, headers = {}, options = {}) {
    return this.executeRequest({ url, method: 'GET', headers, ...options });
  }

  /**
     * POST request with retry capabilities.
     * options: { skipAuthRetry, maxRetries, quiet } — see executeRequest.
     */
  async post(url, body = {}, headers = {}, options = {}) {
    return this.executeRequest({ url, method: 'POST', headers, body, ...options });
  }

  /**
     * PUT request with retry capabilities.
     * options: { skipAuthRetry, maxRetries, quiet } — see executeRequest.
     */
  async put(url, body = {}, headers = {}, options = {}) {
    return this.executeRequest({ url, method: 'PUT', headers, body, ...options });
  }

  /**
     * DELETE request with retry capabilities.
     * options: { skipAuthRetry, maxRetries, quiet } — see executeRequest.
     */
  async delete(url, headers = {}, options = {}) {
    return this.executeRequest({ url, method: 'DELETE', headers, ...options });
  }

  /**
     * PATCH request with retry capabilities.
     * options: { skipAuthRetry, maxRetries, quiet } — see executeRequest.
     */
  async patch(url, body = {}, headers = {}, options = {}) {
    return this.executeRequest({ url, method: 'PATCH', headers, body, ...options });
  }
}

export default new ApiService();
