import { create } from 'zustand';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest, makeAuthenticatedPostRequest, makeAuthenticatedDeleteRequest } from '../services/authenticatedRequests';

const normalizeRoom = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description,
  isPrivate: room.is_private,
  inviteCode: room.invite_code,
  createdAt: room.created_at,
  updatedAt: room.updated_at,
  adminId: room.admin_id,
  currentBookId: room.current_book_id,
  currentBucketId: room.current_bucket_id,
  // Not yet returned by the API — the Home ("Tonight") and Rooms (1a/1c)
  // redesigns need these; default to safe fallbacks so real rooms render
  // fine (just without a badge/progress bar) until the backend adds them.
  currentBookTitle: room.current_book?.title || room.current_book_title || null,
  members: room.members || [],
  unreadCount: room.unread_count || 0,
  groupProgressPct: room.group_progress_pct ?? 0,
  status: room.status || null,
});

// Fixture used by the Home/Rooms redesign (1a/1c) so the screens have
// something meaningful to show before a user has joined a real room, or
// while the backend doesn't yet return members/unreadCount/groupProgressPct.
// TODO: remove once every room the API returns carries those fields.
const FIXTURE_ROOMS = [
  {
    id: 'fixture-midnight-club',
    name: 'Midnight Club',
    currentBookTitle: 'The Midnight Library',
    members: [
      { userId: 'me', initials: 'ME', isMe: true },
      { userId: 'priya', initials: 'PR' },
      { userId: 'tom', initials: 'TO' },
    ],
    unreadCount: 3,
    groupProgressPct: 62,
    status: '3 new comments',
  },
  {
    id: 'fixture-scifi-pals',
    name: 'Sci-fi Pals',
    currentBookTitle: 'Sea of Tranquility',
    members: [
      { userId: 'me', initials: 'ME', isMe: true },
      { userId: 'sam', initials: 'SA' },
      { userId: 'jj', initials: 'JJ' },
    ],
    unreadCount: 0,
    groupProgressPct: 0,
    status: 'starting Sept 1',
  },
];

const useRoomStore = create((set) => ({
  rooms: [],
  activeRoom: null,
  participants: [],
  loading: false,

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl('/room/my-rooms'),
      );

      if (status === 200) {
        log.info('Fetched user rooms successfully:', response);
        // GetMyRooms returns a bare JSON array (null when the user has no
        // rooms, since Go encodes a nil slice as null), not { rooms: [...] }.
        const normalizedRooms = (response || []).map(normalizeRoom);
        set({ rooms: normalizedRooms });
        return { status: 200, response: normalizedRooms };
      } else {
        log.error('Failed to fetch rooms:', response);
        return { status: status || 500, error: response?.error || 'Failed to fetch rooms' };
      }
    } catch (error) {
      log.error('Error fetching rooms:', error);
      return { status: 500, error: error.message || 'Network error' };
    } finally {
      set({ loading: false });
    }
  },

  saveRoom: async (payload) => {
    const roomData = payload.room || payload;
    const backendPayload = {
      name: roomData.name?.trim(),
      description: roomData.description?.trim(),
      is_private: roomData.isPrivate ?? roomData.is_private ?? false,
    };

    try {
      const { status, response } = await makeAuthenticatedPostRequest(
        getBackendUrl('/room/create'),
        backendPayload,
      );

      if (status === 201 || status === 200) {
        log.info('Room created:', response);
        const newRoom = normalizeRoom(response);
        set((state) => ({
          rooms: [...state.rooms, newRoom],
        }));
        return { status: 201, response: newRoom };
      } else {
        log.error('Failed to create room:', response);
        return { status: status || 500, error: response?.error || 'Failed to create room' };
      }
    } catch (error) {
      log.error('Error creating room:', error);
      return { status: 500, error: error.message || 'Network error' };
    }
  },

  // Called after fetchRooms() resolves with an empty list — seeds the fixture
  // rooms so Home/Rooms have something to render. No-ops once real rooms exist.
  loadFixtureRoomsIfEmpty: () => {
    set((state) => (state.rooms.length === 0 ? { rooms: FIXTURE_ROOMS } : state));
  },

  setActiveRoom: (room) => {
    log.info('Setting active room:', room?.name);
    set({ activeRoom: room });
  },

  setRooms: (rooms) => {
    set({ rooms });
  },

  setParticipants: (participants) => {
    set({ participants });
  },

  addParticipant: (participant) => {
    set((state) => ({
      participants: [...state.participants, participant],
    }));
  },

  removeParticipant: (userId) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.user_id !== userId),
    }));
  },

  leaveRoom: () => {
    log.info('Leaving active room');
    set({ activeRoom: null, participants: [] });
  },

  clearRooms: () => {
    set({ rooms: [], activeRoom: null, participants: [] });
  },
}));

export default useRoomStore;
