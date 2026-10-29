// apiService throws "Client error 403: {...}" for a 4xx instead of returning
// it. These get the status and the API's JSON body back out of that error.

// Thrown by apiService instead of making a request the device can't send
// (specs/offline-first R1.2).
export class OfflineError extends Error {
  constructor(message = 'Offline') {
    super(message);
    this.name = 'OfflineError';
    this.offline = true;
  }
}

// The request never got an answer: no connection, a timeout, or the network
// dropping mid-request. A write that fails this way can wait for the outbox;
// one the server answered (4xx, 5xx) can't.
export const isNetworkError = (error) => (
  !!error?.offline
  || !!error?.timeout
  || error?.name === 'AbortError'
  || /Network request failed/i.test(error?.message || '')
);

// The HTTP status, or null for a network error.
export const statusOfError = (error) => {
  const match = /Client error (\d{3})/.exec(error?.message || '');
  return match ? Number(match[1]) : null;
};

// The API's {"error", "code", "field"} body, or {} when there isn't one.
export const bodyOfError = (error) => {
  const match = /Client error \d{3}: ([\s\S]*)$/.exec(error?.message || '');
  if (!match) {
    return {};
  }
  try {
    const body = JSON.parse(match[1]);
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
};
