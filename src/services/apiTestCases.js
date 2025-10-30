/**
 * Test cases demonstrating that login/signup flows work without tokens
 * while authenticated requests properly handle missing tokens
 */

import {
    makePublicPostRequest,
    makeAuthenticatedGetRequest,
    loginRequest,
    signupRequest
} from './authenticatedRequests';

// ✅ THESE WILL WORK WITHOUT TOKENS (Login/Signup flows)

export const testLoginFlow = async () => {
    try {
        // This should work even without any tokens
        const result = await loginRequest('/auth/login', {
            username: 'testuser',
            password: 'testpass'
        });
        console.log('✅ Login request succeeded:', result);
    } catch (error) {
        console.log('❌ Login request failed:', error.message);
    }
};

export const testSignupFlow = async () => {
    try {
        // This should work even without any tokens
        const result = await signupRequest('/auth/signup', {
            username: 'newuser',
            email: 'user@example.com',
            password: 'newpass'
        });
        console.log('✅ Signup request succeeded:', result);
    } catch (error) {
        console.log('❌ Signup request failed:', error.message);
    }
};

export const testPublicDataRequest = async () => {
    try {
        // This should work for public endpoints
        const result = await makePublicPostRequest('/api/public/books');
        console.log('✅ Public request succeeded:', result);
    } catch (error) {
        console.log('❌ Public request failed:', error.message);
    }
};

// ⚠️ THESE WILL TRIGGER AUTH FAILURE (if no tokens available)

export const testAuthenticatedRequest = async () => {
    try {
        // This will check for tokens and fail gracefully if missing
        const result = await makeAuthenticatedGetRequest('/api/user/profile');
        console.log('✅ Authenticated request succeeded:', result);
    } catch (error) {
        if (error.name === 'AuthError') {
            console.log('⚠️ Auth error as expected:', error.message);
        } else {
            console.log('❌ Unexpected error:', error.message);
        }
    }
};

// Usage examples:
// testLoginFlow();     // ✅ Works without tokens
// testSignupFlow();    // ✅ Works without tokens  
// testAuthenticatedRequest(); // ⚠️ Fails gracefully without tokens