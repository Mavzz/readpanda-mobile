// A bucket's page opens offline, curated or the reader's own
// (specs/offline-first R5.2, R5.4).

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('../../services/authenticatedRequests', () => ({
  makeAuthenticatedGetRequest: jest.fn(),
  makeAuthenticatedPostRequest: jest.fn(),
  makeAuthenticatedPutRequest: jest.fn(),
  makeAuthenticatedPatchRequest: jest.fn(),
  makeAuthenticatedDeleteRequest: jest.fn(),
}));
jest.mock('../../utils/enhancedStorage', () => ({
  __esModule: true,
  default: { getUserProfile: () => ({ username: 'me' }), readCache: () => null, writeCache: jest.fn() },
}));

import { makeAuthenticatedGetRequest } from '../../services/authenticatedRequests';
import { OfflineError } from '../../utils/apiError';
import useBucketsStore from '../bucketsStore';

const fetchPage = (id) => useBucketsStore.getState().fetchCuratedBucketBooks(id);

beforeEach(() => useBucketsStore.setState({ curatedBooks: {}, bucketBooks: {} }));

it('falls back to the last page it fetched', async () => {
  makeAuthenticatedGetRequest.mockResolvedValueOnce({ status: 200, response: { title: 'Gothic Nights', books: [{ book_id: 'b1' }] } });
  await fetchPage('cb_1');

  makeAuthenticatedGetRequest.mockRejectedValueOnce(new OfflineError());
  const result = await fetchPage('cb_1');
  expect(result).toEqual({ status: 200, cached: true, response: { title: 'Gothic Nights', books: [{ book_id: 'b1' }] } });
});

it('still fails for a bucket never fetched', async () => {
  makeAuthenticatedGetRequest.mockRejectedValueOnce(new OfflineError());
  expect(await fetchPage('cb_2')).toEqual({ status: null, response: null });
});

it('does the same for one of the reader\'s own buckets', async () => {
  const fetchOwn = (id) => useBucketsStore.getState().fetchBucketBooks(id);
  makeAuthenticatedGetRequest.mockResolvedValueOnce({ status: 200, response: { name: 'Summer', books: [{ book_id: 'b1' }] } });
  await fetchOwn('ub_1');

  makeAuthenticatedGetRequest.mockRejectedValueOnce(new OfflineError());
  expect(await fetchOwn('ub_1')).toEqual({ status: 200, cached: true, response: { name: 'Summer', books: [{ book_id: 'b1' }] } });
  makeAuthenticatedGetRequest.mockRejectedValueOnce(new OfflineError());
  expect(await fetchOwn('ub_2')).toEqual({ status: null, response: null });
});
