// My bucket's + adds several books at once and reports whether it worked, so
// the picker can keep the picks on a failure (specs/coming-soon R4.2, R4.4).

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

import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
} from '../../services/authenticatedRequests';
import useBucketsStore from '../bucketsStore';

const add = (ids) => useBucketsStore.getState().addBooksToBucket(7, ids);

beforeEach(() => {
  jest.clearAllMocks();
  useBucketsStore.setState({ customBuckets: [], bucketBooks: {} });
});

it('posts every picked id and re-reads the bucket tiles', async () => {
  makeAuthenticatedPostRequest.mockResolvedValueOnce({ status: 200, response: {} });
  makeAuthenticatedGetRequest.mockResolvedValue({ status: 200, response: [] });

  await expect(add(['a', 'b'])).resolves.toBe(true);
  expect(makeAuthenticatedPostRequest).toHaveBeenCalledWith(
    expect.stringMatching(/\/users\/me\/buckets\/7\/books$/),
    { book_ids: ['a', 'b'] },
  );
  // Only the list: My bucket re-reads its own page on focus.
  expect(makeAuthenticatedGetRequest).toHaveBeenCalledTimes(1);
  expect(makeAuthenticatedGetRequest).toHaveBeenCalledWith(expect.stringMatching(/\/users\/me\/buckets$/));
});

it('reports a refusal or a lost connection as not added', async () => {
  makeAuthenticatedPostRequest.mockResolvedValueOnce({ status: 500, response: {} });
  await expect(add(['a'])).resolves.toBe(false);

  makeAuthenticatedPostRequest.mockRejectedValueOnce(new Error('offline'));
  await expect(add(['a'])).resolves.toBe(false);
  expect(makeAuthenticatedGetRequest).not.toHaveBeenCalled();
});
