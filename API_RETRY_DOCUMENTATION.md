# API Retry Capabilities Documentation

## Overview

The ReadPanda mobile app now includes comprehensive retry capabilities for handling token failures and network issues. The retry system automatically handles:

- **Token Refresh**: Automatically refreshes expired tokens and retries failed requests
- **Network Failures**: Retries requests that fail due to network issues with exponential backoff
- **Server Errors (5xx)**: Retries server errors with exponential backoff
- **Concurrent Token Refresh**: Prevents multiple simultaneous token refresh attempts

## Architecture

### Core Components

1. **`apiService.js`** - Centralized API service with retry logic
2. **`authenticatedRequests.js`** - Helper functions that automatically include auth tokens
3. **Updated HTTP services** - `useGet.js`, `usePost.js`, `usePut.js` now use the retry system
4. **Enhanced AuthContext** - Includes `refreshToken()` method for centralized token management

### Retry Configuration

```javascript
// Default retry settings
maxRetries: 3
retryDelay: 1000ms (exponential backoff)
```

## Usage Examples

### 1. Basic HTTP Requests (Existing API - No Changes Required)

Your existing code continues to work without modifications:

```javascript
import { getRequest } from '../services/useGet';
import { postRequest } from '../services/usePost';
import { putRequest } from '../services/usePut';

// These now automatically include retry capabilities
const response = await getRequest(url, headers);
const postResponse = await postRequest(url, body, headers);
const putResponse = await putRequest(url, body, headers);
```

### 2. Authenticated Requests (Recommended)

Use the new authenticated request helpers that automatically include auth tokens:

```javascript
import { 
  authenticatedGetRequest,
  authenticatedPostRequest,
  authenticatedPutRequest,
  authenticatedDeleteRequest 
} from '../services/authenticatedRequests';

// Automatically includes Bearer token from storage
const books = await authenticatedGetRequest('/books');
const newBook = await authenticatedPostRequest('/books', bookData);
const updatedBook = await authenticatedPutRequest(`/books/${id}`, updates);
const deleted = await authenticatedDeleteRequest(`/books/${id}`);
```

### 3. Direct API Service Usage

For advanced use cases, you can use the API service directly:

```javascript
import apiService from '../services/apiService';

// Manual token handling
const token = enhanceedStorage.getAuthToken();
const response = await apiService.get('/books', {
  'Authorization': `Bearer ${token}`
});
```

### 4. Token Refresh in Components

Use the AuthContext refresh method for manual token refresh:

```javascript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { refreshToken } = useAuth();
  
  const handleManualRefresh = async () => {
    try {
      const newToken = await refreshToken();
      console.log('Token refreshed:', newToken);
    } catch (error) {
      console.error('Refresh failed:', error);
      // User will be automatically signed out
    }
  };
};
```

## Error Handling

### Token Errors (401, 498)
- Automatically triggers token refresh
- Retries original request with new token
- If refresh fails, user is signed out
- Prevents concurrent refresh attempts

### Server Errors (5xx)
- Retries up to 3 times with exponential backoff
- Delays: 1s, 2s, 4s
- Throws error after max retries

### Client Errors (4xx, except 401/498)
- No retry (these are typically permanent errors)
- Immediate error response

### Network Errors
- Retries up to 3 times with exponential backoff
- Useful for temporary network issues

## Migration Guide

### For Existing Code

No changes required! Your existing `getRequest`, `postRequest`, and `putRequest` calls will automatically benefit from retry capabilities.

### For New Code

Consider using the authenticated request helpers:

```javascript
// Instead of manually adding auth headers:
const token = enhanceedStorage.getAuthToken();
const response = await getRequest(url, {
  'Authorization': `Bearer ${token}`
});

// Use the authenticated helper:
const response = await authenticatedGetRequest(url);
```

### For Components Using API Calls

Add error handling for retry failures:

```javascript
const fetchData = async () => {
  try {
    const response = await authenticatedGetRequest('/data');
    setData(response.response);
  } catch (error) {
    if (error.message.includes('Maximum retry attempts exceeded')) {
      showToast('Network error. Please check your connection.', 'error');
    } else if (error.message.includes('Token refresh failed')) {
      showToast('Session expired. Please log in again.', 'error');
    } else {
      showToast('An error occurred. Please try again.', 'error');
    }
  }
};
```

## Advanced Configuration

### Customizing Retry Behavior

You can modify the retry settings in `apiService.js`:

```javascript
// In apiService.js constructor
this.maxRetries = 5; // Increase max retries
this.retryDelay = 500; // Decrease initial delay
```

### Adding Custom Error Handling

The API service can be extended for specific error handling:

```javascript
// Custom wrapper for specific endpoints
export const bookServiceRequest = async (endpoint, options = {}) => {
  try {
    return await authenticatedGetRequest(`/books${endpoint}`);
  } catch (error) {
    if (error.message.includes('Book not found')) {
      // Handle book-specific errors
      return { status: 404, response: { message: 'Book not found' } };
    }
    throw error;
  }
};
```

## Logging and Debugging

The retry system includes comprehensive logging:

- Token refresh attempts
- Retry attempts with delays
- Error details
- Success confirmations

Check the logs using the app's logger:

```javascript
import log from '../utils/logger';

// Logs are automatically generated by the retry system
// You can add custom logs for debugging:
log.info('Making API request to:', endpoint);
```

## Best Practices

1. **Use Authenticated Helpers**: Prefer `authenticatedGetRequest` over manual token handling
2. **Handle Errors Gracefully**: Always wrap API calls in try-catch blocks
3. **Show User Feedback**: Use toasts to inform users of network issues
4. **Don't Retry User Actions**: Let the system handle retries automatically
5. **Monitor Retry Patterns**: Check logs to identify problematic endpoints

## Testing

The retry system preserves the same response format, so existing tests should continue to work. For testing retry behavior:

```javascript
// Mock network failures
jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

// Mock token refresh
jest.spyOn(enhanceedStorage, 'getRefreshToken').mockReturnValue('refresh_token');
```