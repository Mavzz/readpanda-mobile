/**
 * API Authentication Error Handling Guide
 * 
 * This file documents how the app handles missing authentication tokens
 * and provides examples of proper error handling in components.
 */

import { AuthError, AUTH_ERRORS } from './apiService';
import {
    makeAuthenticatedGetRequest,
    makePublicPostRequest,
    loginRequest,
    signupRequest
} from './authenticatedRequests';
import log from '../utils/logger';

/**
 * REQUEST TYPES AND AUTHENTICATION FLOW SCENARIOS:
 * 
 * PUBLIC REQUESTS (Login/Signup/Public Data):
 * - Use makePublicXRequest() functions or existing postRequest/getRequest
 * - No authentication required
 * - Will never trigger token checks or auth failures
 * 
 * AUTHENTICATED REQUESTS (User Data/Protected Resources):
 * 1. Normal Operation:
 *    - Access token exists and is valid
 *    - Request succeeds
 * 
 * 2. Token Expired:
 *    - Access token expired, refresh token valid
 *    - API service automatically refreshes token and retries request
 * 
 * 3. Both Tokens Missing (this is what we're handling):
 *    - No access token AND no refresh token
 *    - User is automatically signed out and redirected to login
 * 
 * 4. Refresh Token Expired:
 *    - Access token expired, refresh token also expired/invalid
 *    - User is automatically signed out and redirected to login
 */

/**
 * Examples of how to handle API calls in components with proper error handling
 */

// Example 1: Login/Signup (Public Request - No Auth Required)
export const ExampleLoginUsage = () => {
    const handleLogin = async (username, password) => {
        try {
            // Use public request for login - no tokens needed
            const { status, response } = await loginRequest('/auth/login', {
                username,
                password
            });

            if (status === 200) {
                // Login successful - store tokens and redirect
                await authContext.signIn(response);
            } else {
                showToast('Invalid credentials', 'error');
            }

        } catch (error) {
            // Only network/server errors possible - no auth errors
            log.error('Login request failed:', error);
            showToast('Login failed. Please try again.', 'error');
        }
    };
};

// Example 2: Authenticated Request (Requires Valid Tokens)
export const ExampleAuthenticatedUsage = () => {
    const fetchUserData = async () => {
        try {
            const { status, response } = await makeAuthenticatedGetRequest('/api/user/profile');

            if (status === 200) {
                // Handle successful response
                setUserData(response);
            } else {
                // Handle unexpected status codes
                log.warn('Unexpected response status:', status);
            }

        } catch (error) {
            if (error instanceof AuthError) {
                // Authentication errors are automatically handled by the API service
                // The user will be signed out and redirected to login
                // You can optionally show a message here
                log.info('Authentication error occurred, user will be redirected to login');

                // Optional: Show a brief message before redirect
                // showToast('Session expired. Please log in again.', 'info');

            } else {
                // Handle other types of errors (network, server, etc.)
                log.error('API request failed:', error);
                showToast('Failed to load data. Please try again.', 'error');
            }
        }
    };
};/**
 * ERROR TYPES AND HANDLING:
 * 
 * AUTH_ERRORS.NO_TOKENS:
 * - Thrown when no access token or refresh token is available
 * - Automatically triggers signOut() and redirects to login
 * - Components don't need to handle this manually
 * 
 * AUTH_ERRORS.REFRESH_FAILED:
 * - Thrown when token refresh fails due to network/server issues
 * - Also triggers signOut() and redirects to login
 * 
 * AUTH_ERRORS.TOKEN_EXPIRED:
 * - Thrown when refresh token is invalid/expired
 * - Triggers signOut() and redirects to login
 * 
 * Network/Server Errors:
 * - Components should handle these and show appropriate user messages
 * - These don't trigger automatic logout
 */

/**
 * WHAT HAPPENS WHEN TOKENS ARE MISSING:
 * 
 * 1. API request is made with makeAuthenticatedXRequest()
 * 2. Helper checks for access token - if missing, throws AuthError
 * 3. If request reaches ApiService, it also checks for tokens
 * 4. AuthError triggers authFailureCallback
 * 5. authFailureCallback calls AuthContext.signOut()
 * 6. AuthContext clears all user data and tokens
 * 7. App navigation automatically switches to AuthStack (login screens)
 * 8. User sees login screen and can re-authenticate
 * 
 * This ensures users are never stuck in a broken authenticated state
 * and always have a clear path back to working functionality.
 */

export default {
    AuthError,
    AUTH_ERRORS,
};