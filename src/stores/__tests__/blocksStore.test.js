// Blocking (specs/report-block R5, R6), against a mocked API layer.

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('../../services/authenticatedRequests', () => ({
  makeAuthenticatedGetRequest: jest.fn(),
  makeAuthenticatedPostRequest: jest.fn(),
  makeAuthenticatedPatchRequest: jest.fn(),
  makeAuthenticatedDeleteRequest: jest.fn(),
}));
jest.mock('../commentsStore', () => {
  const state = { dropAuthor: jest.fn() };
  return { __esModule: true, default: { getState: () => state } };
});
jest.mock('../roomStore', () => {
  const state = { setMemberBlocked: jest.fn() };
  return { __esModule: true, default: { getState: () => state } };
});

import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from '../../services/authenticatedRequests';
import useCommentsStore from '../commentsStore';
import useRoomStore from '../roomStore';
import useBlocksStore from '../blocksStore';

const store = () => useBlocksStore.getState();
const { dropAuthor } = useCommentsStore.getState();
const { setMemberBlocked } = useRoomStore.getState();

beforeEach(() => {
  jest.clearAllMocks();
  store().clear();
});

it('loads the list for Settings (R6.1)', async () => {
  makeAuthenticatedGetRequest.mockResolvedValue({
    status: 200,
    response: [{ user_id: 'u-ada', username: 'ada', blocked_at: '2026-10-22T10:00:00Z' }],
  });
  expect(await store().fetch()).toEqual({ ok: true });
  expect(store().blocked).toEqual([{ userId: 'u-ada', username: 'ada' }]);
  expect(store().loaded).toBe(true);
});

it('blocks, then clears them from comments and marks them in rooms (R5.2, R5.6)', async () => {
  makeAuthenticatedPostRequest.mockResolvedValue({ status: 204 });
  expect(await store().block({ userId: 'u-ada', username: 'ada' })).toEqual({ ok: true });

  expect(makeAuthenticatedPostRequest.mock.calls[0][1]).toEqual({ user_id: 'u-ada' });
  expect(makeAuthenticatedPostRequest.mock.calls[0][2]).toEqual({ maxRetries: 0 });
  expect(store().isBlocked('u-ada')).toBe(true);
  expect(dropAuthor).toHaveBeenCalledWith('u-ada');
  expect(setMemberBlocked).toHaveBeenCalledWith('u-ada', true);
});

it('changes nothing when blocking fails', async () => {
  makeAuthenticatedPostRequest.mockRejectedValue(new Error('Client error 400: {"error":"You can\'t block that reader"}'));
  expect(await store().block({ userId: 'u-me', username: 'me' })).toEqual({ ok: false });
  expect(store().blocked).toEqual([]);
  expect(dropAuthor).not.toHaveBeenCalled();
});

it('unblocks (R6.3)', async () => {
  makeAuthenticatedPostRequest.mockResolvedValue({ status: 204 });
  makeAuthenticatedDeleteRequest.mockResolvedValue({ status: 204 });
  await store().block({ userId: 'u-ada', username: 'ada' });

  expect(await store().unblock('u-ada')).toEqual({ ok: true });
  expect(makeAuthenticatedDeleteRequest.mock.calls[0][0]).toMatch(/\/users\/me\/blocks\/u-ada$/);
  expect(store().blocked).toEqual([]);
  expect(setMemberBlocked).toHaveBeenLastCalledWith('u-ada', false);
});
