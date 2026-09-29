import { useEffect } from 'react';
import getInitials from '../../utils/getInitials';
import useAuthStore from '../../stores/authStore';
import useRoomStore from '../../stores/roomStore';
import useBooksStore from '../../stores/booksStore';
import useBucketsStore from '../../stores/bucketsStore';

// The room this lobby is about, and who is in it. Book, bucket and progress
// state is read by BookSection itself, so a picker or progress change doesn't
// re-render the invite and member sections.
const useRoomLobby = (routeRoom) => {
  const user = useAuthStore((s) => s.user);

  // Read the live room out of the store so a reading choice re-renders here;
  // fall back to the route snapshot for rooms not in the list.
  const storedRoom = useRoomStore((s) => s.rooms.find((r) => r.id === routeRoom?.id));
  const room = storedRoom || routeRoom;
  const fetchRoomDetail = useRoomStore((s) => s.fetchRoomDetail);
  const fetchBooks = useBooksStore((s) => s.fetchBooks);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const fetchCuratedBuckets = useBucketsStore((s) => s.fetchCuratedBuckets);

  useEffect(() => {
    // GET /room/{id} brings the real members, current book and bucket.
    // Fixture rooms (ids prefixed "fixture-") have no server record.
    if (routeRoom?.id && !String(routeRoom.id).startsWith('fixture-')) {
      fetchRoomDetail(routeRoom.id);
    }
    // The pickers read from these stores; make sure they're populated.
    fetchBooks();
    fetchCustomBuckets();
    fetchCuratedBuckets();
    // Store actions are stable, so this still runs once per room id.
  }, [routeRoom?.id, fetchRoomDetail, fetchBooks, fetchCustomBuckets, fetchCuratedBuckets]);

  const selfName = user?.username || 'You';

  // Members come from GET /room/{id}. We identify "me" by username, since the
  // client doesn't hold its own user id. Self sorts first; the API already
  // returns the creator first otherwise.
  const apiMembers = (room?.members || []).map((m, i) => {
    const name = m.name || m.username || m.initials || 'Member';
    return {
      id: m.userId || m.user_id || `member-${i}`,
      name,
      initials: m.initials || getInitials(name),
      isSelf: m.isMe || name === selfName,
      isCreator: !!m.isCreator,
      joinedAt: m.joinedAt || m.joined_at || null,
    };
  });

  const iAmCreator = apiMembers.length > 0
    ? apiMembers.some((m) => m.isSelf && m.isCreator)
    // Before detail loads (or for a fixture room) assume the viewer's own room.
    : true;

  const members = apiMembers.length > 0
    ? [...apiMembers].sort((a, b) => Number(b.isSelf) - Number(a.isSelf))
    // Before the detail call resolves (or for a fixture room) the one member
    // we can always name is the person looking at the screen.
    : [{ id: 'self', name: selfName, initials: getInitials(selfName), isSelf: true, isCreator: true }];

  return {
    room,
    members,
    iAmCreator,
    inviteCode: room?.inviteCode || room?.invite_code || null,
    bucket: room?.bucket || null,
    currentBook: room?.currentBook || null,
    bookTitle: room?.currentBook?.title || room?.currentBookTitle || null,
  };
};

export default useRoomLobby;
