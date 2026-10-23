// apiService throws "Client error 403: {...}" for a 4xx instead of returning
// it. These get the status and the API's JSON body back out of that error.

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
