// What a progress save sends (specs/offline-first R9.2).

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('../authenticatedRequests', () => ({
  makeAuthenticatedPutRequest: jest.fn(() => Promise.resolve({ status: 200, response: {} })),
  makeAuthenticatedGetRequest: jest.fn(),
}));

import { makeAuthenticatedPutRequest } from '../authenticatedRequests';
import { putReadingProgress } from '../progressService';

it('sends when the page was read, and passes quiet through', async () => {
  const readAt = Date.UTC(2026, 9, 26, 9, 30);
  await putReadingProgress('bk_1', { currentPage: 40, totalPages: 200 }, { readAt, quiet: true });
  const [url, body, options] = makeAuthenticatedPutRequest.mock.calls[0];
  expect(url).toMatch(/\/progress\/bk_1$/);
  expect(body).toEqual({ current_page: 40, total_pages: 200, read_at: '2026-10-26T09:30:00.000Z' });
  expect(options).toEqual({ quiet: true });
});

it('a save made now says now', async () => {
  const before = Date.now();
  await putReadingProgress('bk_1', { currentPage: 1, totalPages: 2 });
  const { read_at: readAt } = makeAuthenticatedPutRequest.mock.calls[0][1];
  expect(Date.parse(readAt)).toBeGreaterThanOrEqual(before);
  expect(makeAuthenticatedPutRequest.mock.calls[0][2]).toEqual({ quiet: false });
});
