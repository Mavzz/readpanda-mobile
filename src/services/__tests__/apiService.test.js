jest.mock('../../utils/enhancedStorage', () => ({
  __esModule: true,
  default: {
    getAuthToken: jest.fn(),
    getRefreshToken: jest.fn(),
    updateAuthToken: jest.fn(),
    updateRefreshToken: jest.fn(),
    clearAuthData: jest.fn(),
  },
}));

import { Alert } from 'react-native';
import enhancedStorage from '../../utils/enhancedStorage';
import apiService, { AuthError, AUTH_ERRORS, SUSPENDED_MESSAGE } from '../apiService';

const json = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
  text: async () => JSON.stringify(body ?? ''),
});

let fetchMock;
beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock;
  apiService.retryDelay = 0; // no real backoff in tests
  apiService.isRefreshing = false;
  apiService.failedQueue = [];
  apiService.setAuthFailureCallback(null);
  apiService.suspendedShown = false;
  enhancedStorage.getAuthToken.mockReturnValue('old-access');
  enhancedStorage.getRefreshToken.mockReturnValue('old-refresh');
});

describe('apiService', () => {
  it('returns status and parsed body', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: 1 }));
    await expect(apiService.get('https://api/x', { Authorization: 'Bearer t' })).resolves.toEqual({ status: 200, response: { ok: 1 } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Application-Type']).toBe('mobile');
    expect(init.headers.Authorization).toBe('Bearer t');
  });

  it('JSON-encodes bodies on writes', async () => {
    fetchMock.mockResolvedValue(json(201, {}));
    await apiService.post('https://api/x', { a: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe('{"a":1}');
    expect(init.headers['Content-Type']).toBe('application/json');
  });

  it('does not retry a 4xx', async () => {
    fetchMock.mockResolvedValue(json(404, { error: 'nope' }));
    await expect(apiService.get('https://api/x')).rejects.toThrow('Client error 404');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a 5xx, then gives up', async () => {
    fetchMock.mockResolvedValue(json(503, {}));
    await expect(apiService.get('https://api/x')).rejects.toThrow(/Server error 503/);
    expect(fetchMock).toHaveBeenCalledTimes(apiService.maxRetries + 1);
  });

  it('recovers from a transient 5xx', async () => {
    fetchMock.mockResolvedValueOnce(json(502, {})).mockResolvedValueOnce(json(200, { ok: 1 }));
    await expect(apiService.get('https://api/x')).resolves.toMatchObject({ status: 200 });
  });

  it('refreshes an expired token, stores the rotated pair, and retries', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { accessToken: 'new-access', refreshToken: 'new-refresh' }))
      .mockResolvedValueOnce(json(200, { ok: 1 }));

    await expect(apiService.get('https://api/x', { Authorization: 'Bearer old-access' })).resolves.toMatchObject({ status: 200 });

    expect(fetchMock.mock.calls[1][0]).toMatch(/\/token\/refresh$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ refreshToken: 'old-refresh' });
    expect(enhancedStorage.updateAuthToken).toHaveBeenCalledWith('new-access');
    expect(enhancedStorage.updateRefreshToken).toHaveBeenCalledWith('new-refresh');
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access');
  });

  it('never refreshes for skipAuthRetry requests (e.g. a wrong password)', async () => {
    fetchMock.mockResolvedValue(json(401, { error: 'Invalid username or password' }));
    await expect(apiService.post('https://api/auth/login', {}, {}, { skipAuthRetry: true })).rejects.toThrow('Client error 401');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('signs out once when the refresh token is rejected', async () => {
    const signOut = jest.fn();
    apiService.setAuthFailureCallback(signOut);
    fetchMock.mockImplementation(async (url) => (url.endsWith('/token/refresh') ? json(401, {}) : json(401, {})));

    const err = await apiService.get('https://api/x').catch((e) => e);

    expect(err).toBeInstanceOf(AuthError);
    expect(enhancedStorage.clearAuthData).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    // One original request and one refresh: a dead session isn't retried.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one refresh between concurrent requests', async () => {
    let releaseRefresh;
    fetchMock.mockImplementation((url, init) => {
      if (url.endsWith('/token/refresh')) {
        return new Promise((resolve) => { releaseRefresh = () => resolve(json(200, { accessToken: 'new-access' })); });
      }
      return Promise.resolve(init.headers.Authorization === 'Bearer new-access' ? json(200, { ok: 1 }) : json(401, {}));
    });

    const both = Promise.all([apiService.get('https://api/a'), apiService.get('https://api/b')]);
    await new Promise(setImmediate);
    releaseRefresh();
    await expect(both).resolves.toHaveLength(2);

    const refreshes = fetchMock.mock.calls.filter(([url]) => url.endsWith('/token/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('fails fast with no tokens at all', async () => {
    enhancedStorage.getAuthToken.mockReturnValue(null);
    enhancedStorage.getRefreshToken.mockReturnValue(null);
    await expect(apiService.refreshAuthToken()).rejects.toMatchObject({ type: AUTH_ERRORS.NO_TOKENS });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('a suspended account (report-block R10.2)', () => {
    const suspended = { error: SUSPENDED_MESSAGE, code: 'account_suspended' };
    let alert;
    beforeEach(() => {
      alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });
    afterEach(() => alert.mockRestore());

    it('signs out and says why, once, however many calls are refused', async () => {
      const signOut = jest.fn();
      apiService.setAuthFailureCallback(signOut);
      fetchMock.mockResolvedValue(json(403, suspended));

      const errors = await Promise.all([
        apiService.post('https://api/room/create', {}).catch((e) => e),
        apiService.post('https://api/reports', {}).catch((e) => e),
      ]);

      expect(errors.every((e) => e.suspended)).toBe(true);
      expect(enhancedStorage.clearAuthData).toHaveBeenCalled();
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(alert).toHaveBeenCalledTimes(1);
      expect(alert.mock.calls[0].slice(0, 2)).toEqual(['Account suspended', SUSPENDED_MESSAGE]);
    });

    it('does the same when the refresh is refused', async () => {
      const signOut = jest.fn();
      apiService.setAuthFailureCallback(signOut);
      fetchMock.mockImplementation(async (url) => (url.endsWith('/token/refresh') ? json(403, suspended) : json(401, {})));

      const err = await apiService.get('https://api/x').catch((e) => e);

      expect(err).toBeInstanceOf(AuthError);
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(alert).toHaveBeenCalledWith('Account suspended', SUSPENDED_MESSAGE, expect.any(Array), expect.any(Object));
    });

    it('leaves other 403s alone', async () => {
      const signOut = jest.fn();
      apiService.setAuthFailureCallback(signOut);
      fetchMock.mockResolvedValue(json(403, { error: 'Only the room creator can change this room' }));
      const err = await apiService.post('https://api/room/x', {}).catch((e) => e);
      expect(err.suspended).toBeUndefined();
      expect(signOut).not.toHaveBeenCalled();
      expect(alert).not.toHaveBeenCalled();
    });
  });
});
