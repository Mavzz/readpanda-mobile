import useRoomStore from '../stores/roomStore';
import log from './logger';

// A shelf row's tap (My Books 8b, Currently reading 10d): a book read with a
// room opens that room (the active Room, 2c / 14i), a solo book its own view
// (4b). Rooms may not have loaded yet; the Room screen fetches the rest from
// the id, so the row's own id and name are enough to get there.
const openShelfBook = (navigation, book) => {
  log.info('Opening shelf row:', book.title);
  if (book.roomId || book.roomName) {
    const rooms = useRoomStore.getState().rooms;
    const room = rooms.find((r) => r.id === book.roomId)
      || rooms.find((r) => r.name === book.roomName)
      || { id: book.roomId, name: book.roomName };
    navigation.navigate('RoomLobbyScreen', { room });
    return;
  }
  navigation.navigate('SoloBookScreen', { bookId: book.id });
};

export default openShelfBook;
