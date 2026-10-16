// Where a tapped notification goes. The stores are the real ones, with the
// parts that would reach the server replaced.

jest.mock('../../components/Toaster', () => ({ showToast: jest.fn() }));
jest.mock('../readerBook', () => ({ __esModule: true, default: jest.fn() }));
// The room store caches its rooms to disk; there's no MMKV under Jest.
jest.mock('../enhancedStorage', () => ({
  __esModule: true,
  default: { writeCache: jest.fn(), readCache: jest.fn(() => null) },
}));

import { showToast } from '../../components/Toaster';
import findReaderBook from '../readerBook';
import useNotificationStore from '../../stores/notificationStore';
import useRoomStore from '../../stores/roomStore';
import openNotification, { GONE_MESSAGE, notificationFromPush } from '../openNotification';

const dune = { book_id: 'bk_1', title: 'Dune', manuscript_url: 'm.pdf' };
const club = { id: 'rm_1', name: 'AI Learning' };

let navigate;
let close;
let markAsRead;
let fetchRooms;

beforeEach(() => {
  jest.clearAllMocks();
  navigate = jest.fn();
  close = jest.fn();
  markAsRead = jest.fn();
  fetchRooms = jest.fn(() => Promise.resolve({ status: 200 }));
  useNotificationStore.setState({ markAsRead });
  useRoomStore.setState({ rooms: [club], fetchRooms });
  findReaderBook.mockResolvedValue(dune);
});

const open = (notification) => openNotification(notification, { navigate, close });

describe.each(['REPLY', 'ROOM_COMMENTS'])('%s', (type) => {
  it('opens the reader on that room', async () => {
    await expect(open({ id: 4, type, bookId: 'bk_1', roomId: 'rm_1' })).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith('ManuscriptScreen', { book: dune, roomId: 'rm_1' });
    expect(close).toHaveBeenCalled();
    expect(markAsRead).toHaveBeenCalledWith(4);
  });
});

describe.each(['ROOM_JOIN', 'ROOM_BOOK'])('%s', (type) => {
  it('opens the room', async () => {
    await expect(open({ id: 5, type, roomId: 'rm_1' })).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith('RoomLobbyScreen', { room: club });
  });
});

it('NEW_BOOK still opens the book', async () => {
  await open({ id: 6, type: 'NEW_BOOK', bookId: 'bk_1' });
  expect(navigate).toHaveBeenCalledWith('ManuscriptScreen', { book: dune });
});

it('SYSTEM is only marked read', async () => {
  await expect(open({ id: 7, type: 'SYSTEM' })).resolves.toBe(false);
  expect(markAsRead).toHaveBeenCalledWith(7);
  expect(navigate).not.toHaveBeenCalled();
  expect(showToast).not.toHaveBeenCalled();
});

it('an already-read row isn\'t marked again', async () => {
  await open({ id: 8, type: 'ROOM_JOIN', roomId: 'rm_1', read: true });
  expect(markAsRead).not.toHaveBeenCalled();
});

describe('when the target is gone', () => {
  const expectGone = () => {
    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(GONE_MESSAGE, 'error');
    // Closed first: the inbox Modal would cover the toast.
    expect(close.mock.invocationCallOrder[0]).toBeLessThan(showToast.mock.invocationCallOrder[0]);
  };

  it('the book was removed', async () => {
    findReaderBook.mockResolvedValue(null);
    await expect(open({ type: 'ROOM_COMMENTS', bookId: 'bk_gone', roomId: 'rm_1' })).resolves.toBe(false);
    expectGone();
  });

  it('the reader left the room, or it was deleted', async () => {
    await open({ type: 'ROOM_JOIN', roomId: 'rm_other' });
    expect(fetchRooms).toHaveBeenCalled(); // asked the server before deciding
    expectGone();
  });

  it('NEW_BOOK for a book that\'s gone', async () => {
    findReaderBook.mockResolvedValue(null);
    await open({ type: 'NEW_BOOK', bookId: 'bk_gone' });
    expectGone();
  });

  it('something throws', async () => {
    findReaderBook.mockRejectedValue(new Error('offline'));
    await open({ type: 'REPLY', bookId: 'bk_1', roomId: 'rm_1' });
    expectGone();
  });
});

it('finds a room that wasn\'t loaded yet (cold start)', async () => {
  useRoomStore.setState({ rooms: [] });
  fetchRooms.mockImplementation(async () => {
    useRoomStore.setState({ rooms: [club] });
    return { status: 200 };
  });

  await open({ type: 'ROOM_BOOK', roomId: 'rm_1' });

  expect(navigate).toHaveBeenCalledWith('RoomLobbyScreen', { room: club });
});

it('goes anyway when rooms can\'t be fetched (offline)', async () => {
  useRoomStore.setState({ rooms: [] });
  fetchRooms.mockResolvedValue({ status: 500 });

  await open({ type: 'ROOM_JOIN', roomId: 'rm_1', roomName: 'AI Learning' });

  expect(navigate).toHaveBeenCalledWith('RoomLobbyScreen', { room: { id: 'rm_1', name: 'AI Learning' } });
});

it('notificationFromPush reads the server\'s string data', () => {
  expect(notificationFromPush({
    type: 'ROOM_COMMENTS', notification_id: '42', book_id: 'bk_1', room_id: 'rm_1', room_name: 'AI Learning',
  })).toEqual({ id: 42, type: 'ROOM_COMMENTS', bookId: 'bk_1', roomId: 'rm_1', roomName: 'AI Learning' });
  expect(notificationFromPush({ type: 'SYSTEM' })).toEqual({
    id: null, type: 'SYSTEM', bookId: null, roomId: null, roomName: null,
  });
});
