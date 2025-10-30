import apiService from './apiService';
import enhanceedStorage from '../utils/enhanceedStorage';
import { AuthError, AUTH_ERRORS } from './apiService';

/**
 * Helper functions for making API requests
 * 
 * Two types:
 * 1. Authenticated requests - require valid tokens, throw AuthError if missing
 * 2. Public requests - don't require tokens (for login/signup/public data)
 */

// ========== PUBLIC REQUESTS (no authentication required) ==========

export const makePublicGetRequest = async (url, headers = {}) => {
    return await apiService.get(url, headers);
};

export const makePublicPostRequest = async (url, body = {}, headers = {}) => {
    return await apiService.post(url, body, headers);
};

export const makePublicPutRequest = async (url, body = {}, headers = {}) => {
    return await apiService.put(url, body, headers);
};

export const makePublicDeleteRequest = async (url, headers = {}) => {
    return await apiService.delete(url, headers);
};

export const makePublicPatchRequest = async (url, body = {}, headers = {}) => {
    return await apiService.patch(url, body, headers);
};

// ========== AUTHENTICATED REQUESTS (require valid tokens) ==========

export const makeAuthenticatedGetRequest = async (url) => {
    const token = enhanceedStorage.getAuthToken();

    if (!token) {
        throw new AuthError(AUTH_ERRORS.NO_TOKENS, 'No authentication token available for GET request');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    return await apiService.get(url, headers);
};

export const makeAuthenticatedPostRequest = async (url, body) => {
    const token = enhanceedStorage.getAuthToken();

    if (!token) {
        throw new AuthError(AUTH_ERRORS.NO_TOKENS, 'No authentication token available for POST request');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    return await apiService.post(url, body, headers);
};

export const makeAuthenticatedPutRequest = async (url, body) => {
    const token = enhanceedStorage.getAuthToken();

    if (!token) {
        throw new AuthError(AUTH_ERRORS.NO_TOKENS, 'No authentication token available for PUT request');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    return await apiService.put(url, body, headers);
};

export const makeAuthenticatedDeleteRequest = async (url) => {
    const token = enhanceedStorage.getAuthToken();

    if (!token) {
        throw new AuthError(AUTH_ERRORS.NO_TOKENS, 'No authentication token available for DELETE request');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    return await apiService.delete(url, headers);
};

export const makeAuthenticatedPatchRequest = async (url, body) => {
    const token = enhanceedStorage.getAuthToken();

    if (!token) {
        throw new AuthError(AUTH_ERRORS.NO_TOKENS, 'No authentication token available for PATCH request');
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
    };

    return await apiService.patch(url, body, headers);
};

// ========== CONVENIENCE EXPORTS ==========

// Export public requests with shorter names for login/signup flows
export const loginRequest = makePublicPostRequest;
export const signupRequest = makePublicPostRequest;
export const publicApiRequest = makePublicGetRequest;