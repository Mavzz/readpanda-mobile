// A room an admin deleted while it was open (specs/report-block R9.9).

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

import { makeAuthenticatedGetRequest } from '../../services/authenticatedRequests';
import useReadingProgressStore from '../readingProgressStore';
import useRoomStore from '../roomStore';

const store = () => useRoomStore.getState();
const detachRoom = useReadingProgressStore.getState().detachRoom;

const initial = useRoomStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  useRoomStore.setState({
    ...initial,
    rooms: [{ id: 'rm_1', name: 'Test room' }, { id: 'rm_2', name: 'Mid club' }],
    activeRoom: { id: 'rm_1', name: 'Test room' },
  }, true);
});

it('drops a room that 404s and notes it for its page (R9.9)', async () => {
  // apiService throws a 4xx rather than returning it.
  makeAuthenticatedGetRequest.mockRejectedValue(new Error('Client error 404: {"error": "Room not found"}'));

  const result = await store().fetchRoomDetail('rm_1');

  expect(result.status).toBe(404);
  expect(store().rooms.map((r) => r.id)).toEqual(['rm_2']);
  expect(store().activeRoom).toBeNull();
  expect(store().removedRoomIds).toEqual(['rm_1']);
  expect(detachRoom).toHaveBeenCalledWith('rm_1', 'Test room');
});

it('keeps the room on any other failure', async () => {
  makeAuthenticatedGetRequest.mockRejectedValue(new Error('Client error 403: {"error": "Not a member"}'));

  await store().fetchRoomDetail('rm_1');

  expect(store().rooms).toHaveLength(2);
  expect(store().removedRoomIds).toEqual([]);
  expect(detachRoom).not.toHaveBeenCalled();
});

it('re-reads only the active room, not the list', () => {
  makeAuthenticatedGetRequest.mockResolvedValue({ status: 200, response: { id: 'rm_1', name: 'Test room' } });

  store().recheckActiveRoom();

  expect(makeAuthenticatedGetRequest).toHaveBeenCalledTimes(1);
  expect(makeAuthenticatedGetRequest.mock.calls[0][0]).toMatch(/\/room\/rm_1$/);
});

it('has nothing to re-read with no active room', () => {
  useRoomStore.setState({ activeRoom: null });

  store().recheckActiveRoom();

  expect(makeAuthenticatedGetRequest).not.toHaveBeenCalled();
});

it('forgets removed rooms on sign-out', () => {
  useRoomStore.setState({ removedRoomIds: ['rm_1'] });

  store().clearRooms();

  expect(store().removedRoomIds).toEqual([]);
});
