// Open rooms in the room store (specs/open-rooms), against a mocked API layer.

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('../../services/authenticatedRequests', () => ({
  makeAuthenticatedGetRequest: jest.fn(),
  makeAuthenticatedPostRequest: jest.fn(),
  makeAuthenticatedPatchRequest: jest.fn(),
  makeAuthenticatedDeleteRequest: jest.fn(),
}));
jest.mock('../readingProgressStore', () => {
  const state = { attachRoom: jest.fn(), detachRoom: jest.fn(), reconcileRooms: jest.fn() };
  return { __esModule: true, default: { getState: () => state } };
});
jest.mock('../../utils/enhancedStorage', () => ({
  __esModule: true,
  default: { getUserProfile: () => ({ username: 'me' }), readCache: () => null, writeCache: jest.fn() },
}));

import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedPatchRequest,
} from '../../services/authenticatedRequests';
import useReadingProgressStore from '../readingProgressStore';
import useRoomStore from '../roomStore';

const store = () => useRoomStore.getState();
const attachRoom = useReadingProgressStore.getState().attachRoom;

const detail = (overrides = {}) => ({
  id: 'rm_1',
  name: 'Midnight Club',
  is_private: false,
  invite_code: 'ABC123',
  current_book: { book_id: 'bk_1', title: 'Middlemarch' },
  members: [{ user_id: 'u1', username: 'ada', role: 'admin' }],
  ...overrides,
});

const initial = useRoomStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  useRoomStore.setState(initial, true);
});

describe('fetchOpenRooms', () => {
  it('asks for one book\'s rooms and maps them for the cards (R4.1)', async () => {
    makeAuthenticatedGetRequest.mockResolvedValue({
      status: 200,
      response: {
        rooms: [{
          id: 'rm_1',
          name: 'Midnight Club',
          description: '',
          current_book: { book_id: 'bk_1', title: 'Middlemarch', cover_image_url: 'c.jpg' },
          member_count: 3,
          creator_username: 'ada',
        }],
        has_more: true,
      },
    });

    const result = await store().fetchOpenRooms({ bookId: 'bk 1', limit: 5 });

    expect(makeAuthenticatedGetRequest.mock.calls[0][0]).toMatch(/\/room\/open\?limit=5&offset=0&book_id=bk%201$/);
    expect(result).toEqual({
      status: 200,
      hasMore: true,
      rooms: [{
        id: 'rm_1',
        name: 'Midnight Club',
        description: '',
        currentBookTitle: 'Middlemarch',
        coverUrl: 'c.jpg',
        memberCount: 3,
        creatorName: 'ada',
      }],
    });
    // Each screen keeps its own list.
    expect(store().rooms).toEqual([]);
  });

  it('gives an empty list when the request fails (R2.3)', async () => {
    makeAuthenticatedGetRequest.mockRejectedValue(new Error('offline'));
    expect(await store().fetchOpenRooms()).toEqual({ status: 500, rooms: [], hasMore: false });
  });
});

// apiService throws on a 4xx rather than returning it.
const clientError = (status, body) => new Error(`Client error ${status}: ${JSON.stringify(body)}`);

describe('joinOpenRoom', () => {
  it('adds the room and takes up its book, as joining by code does (R5.2, R5.3)', async () => {
    makeAuthenticatedPostRequest.mockResolvedValue({ status: 200, response: detail() });

    const result = await store().joinOpenRoom('rm_1');

    expect(makeAuthenticatedPostRequest.mock.calls[0][0]).toMatch(/\/room\/rm_1\/join$/);
    expect(result.status).toBe(200);
    expect(store().rooms.map((r) => r.id)).toEqual(['rm_1']);
    expect(attachRoom).toHaveBeenCalledWith(expect.objectContaining({ id: 'rm_1', currentBookId: 'bk_1' }), { adopt: true });
  });

  it('says why a stale room can\'t be joined (R5.5, R5.6)', async () => {
    makeAuthenticatedPostRequest.mockRejectedValueOnce(clientError(403, { error: 'This room is invite-only' }));
    expect(await store().joinOpenRoom('rm_1')).toEqual({ status: 403, error: 'This room is invite-only now' });

    makeAuthenticatedPostRequest.mockRejectedValueOnce(clientError(404, { error: 'Room not found' }));
    expect(await store().joinOpenRoom('rm_1')).toEqual({ status: 404, error: 'This room is gone' });

    expect(store().rooms).toEqual([]);
    expect(attachRoom).not.toHaveBeenCalled();
  });

  it('reports a member as already in, not as an error (R5.7)', async () => {
    makeAuthenticatedPostRequest.mockRejectedValue(clientError(409, { error: 'You\'re already in this room' }));
    expect(await store().joinOpenRoom('rm_1')).toEqual({ status: 409, already: true });
  });

  it('answers at once when the API can\'t be reached', async () => {
    makeAuthenticatedPostRequest.mockRejectedValue(new TypeError('Network request failed'));
    expect(await store().joinOpenRoom('rm_1')).toEqual({ status: 500, error: 'Couldn\'t join that room. Try again.' });
    expect(makeAuthenticatedPostRequest.mock.calls[0][2]).toEqual({ maxRetries: 0 });
  });
});

describe('setRoomPrivacy', () => {
  beforeEach(async () => {
    makeAuthenticatedPostRequest.mockResolvedValue({ status: 200, response: detail({ is_private: true }) });
    await store().joinOpenRoom('rm_1');
  });

  it('shows the change before the API answers (R6.3)', async () => {
    let finish;
    makeAuthenticatedPatchRequest.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

    const saving = store().setRoomPrivacy('rm_1', false);
    expect(store().rooms[0].isPrivate).toBe(false);
    expect(makeAuthenticatedPatchRequest.mock.calls[0][1]).toEqual({ is_private: false });

    finish({ status: 200, response: detail({ is_private: false }) });
    expect((await saving).status).toBe(200);
    expect(store().rooms[0].isPrivate).toBe(false);
  });

  it('puts it back when saving fails (R6.4)', async () => {
    makeAuthenticatedPatchRequest.mockRejectedValue(clientError(403, { error: 'nope' }));

    const result = await store().setRoomPrivacy('rm_1', false);

    expect(result).toEqual({ status: 500, error: 'Couldn\'t change who can join' });
    expect(store().rooms[0].isPrivate).toBe(true);
    // Put back now, not after the retries' backoff.
    expect(makeAuthenticatedPatchRequest.mock.calls[0][2]).toEqual({ maxRetries: 0 });
  });
});

it('creates rooms invite-only unless told otherwise (R7.2)', async () => {
  makeAuthenticatedPostRequest.mockResolvedValue({ status: 201, response: detail() });

  await store().saveRoom({ name: 'Quiet' });
  expect(makeAuthenticatedPostRequest.mock.calls[0][1].is_private).toBe(true);

  await store().saveRoom({ name: 'Loud', isPrivate: false });
  expect(makeAuthenticatedPostRequest.mock.calls[1][1].is_private).toBe(false);
});

it('says which field a refused room name is about (report-block R8.4)', async () => {
  makeAuthenticatedPostRequest.mockRejectedValue(new Error(
    'Client error 400: {"error":"That includes words we don\'t allow.","code":"blocked_words","field":"name"}',
  ));
  expect(await store().saveRoom({ name: 'rude' })).toEqual({
    status: 400, error: 'That includes words we don\'t allow.', field: 'name', code: 'blocked_words',
  });
});
