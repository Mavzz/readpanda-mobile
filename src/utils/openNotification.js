import { showToast } from '../components/Toaster';
import useNotificationStore from '../stores/notificationStore';
import useRoomStore from '../stores/roomStore';
import findReaderBook from './readerBook';
import { sameId } from './bookId';
import log from './logger';

export const GONE_MESSAGE = 'That\'s no longer available';

// Opened in the reader, on the room's comments.
const READER_TYPES = new Set(['REPLY', 'ROOM_COMMENTS']);
// Opened on the room itself.
const ROOM_TYPES = new Set(['ROOM_JOIN', 'ROOM_BOOK']);

// The room, if the reader is still in it. Rooms may not have loaded yet
// (a push that cold-started the app), so ask the server before deciding
// they've left. If that ask fails too, go anyway with what the notification
// knows: the Room screen fetches the rest from the id, and says so itself if
// the room is gone.
const findMyRoom = async (roomId, roomName) => {
  const mine = () => useRoomStore.getState().rooms.find((r) => sameId(r.id, roomId));
  if (mine()) {
    return mine();
  }
  const { status } = await useRoomStore.getState().fetchRooms();
  if (status !== 200) {
    return { id: roomId, name: roomName || '' };
  }
  return mine() || null;
};

// Where a tapped notification goes, from a push or from the inbox, so the two
// can't drift apart. `navigate(screen, params)` is the caller's way of getting
// to a Main stack screen; `close` runs first, before navigating or saying
// it's gone — the inbox is a Modal, which would hide the toast. Resolves to
// whether it opened something.
const openNotification = async (notification, { navigate, close = () => {} }) => {
  const { id, type, bookId, roomId, roomName, read } = notification;
  if (id && !read) {
    useNotificationStore.getState().markAsRead(id);
  }

  const gone = () => {
    close();
    showToast(GONE_MESSAGE, 'error');
    return false;
  };

  try {
    if (READER_TYPES.has(type)) {
      const room = await findMyRoom(roomId, roomName);
      const book = room ? await findReaderBook(bookId) : null;
      if (!room || !book) {
        return gone();
      }
      close();
      navigate('ManuscriptScreen', { book, roomId: room.id });
      return true;
    }

    if (ROOM_TYPES.has(type)) {
      const room = await findMyRoom(roomId, roomName);
      if (!room) {
        return gone();
      }
      close();
      navigate('RoomLobbyScreen', { room });
      return true;
    }

    if (type === 'NEW_BOOK' && bookId) {
      const book = await findReaderBook(bookId);
      if (!book) {
        return gone();
      }
      close();
      navigate('ManuscriptScreen', { book });
      return true;
    }
  } catch (error) {
    log.error('Could not open notification:', error);
    return gone();
  }

  // SYSTEM and anything this version doesn't know: marking it read is all.
  return false;
};

// A push's data, as the server sends it (all strings), as a notification.
export const notificationFromPush = (data = {}) => ({
  id: Number(data.notification_id) || null,
  type: data.type,
  bookId: data.book_id || null,
  roomId: data.room_id || null,
  roomName: data.room_name || null,
});

export default openNotification;
