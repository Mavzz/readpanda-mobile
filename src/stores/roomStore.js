import { create } from 'zustand';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest, makeAuthenticatedPostRequest, makeAuthenticatedPatchRequest, makeAuthenticatedDeleteRequest } from '../services/authenticatedRequests';

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
  currentBookTitle: room.current_book?.title || room.current_book_title || null,
  coverUrl: room.current_book?.cover_image_url || room.current_book_cover_url || null,
  // A room reads EITHER a standalone book OR a bucket (a shared reading list)
  // with a current book chosen from it — ROOM_DETAIL_2a-2.md. Invariant:
  // bucket set ⇒ currentBook ∈ bucket; progress/comments key on currentBook.
  // GET /room/{id} returns bucket as { id, name, type, books[] }.
  bucket: room.bucket || null,
  currentBook: room.current_book || null,
  // GET /room/{id} returns members as { user_id, username, role, joined_at }.
  members: (room.members || []).map((m) => ({
    userId: m.user_id ?? m.userId,
    name: m.username ?? m.name,
    initials: m.initials || null,
    isCreator: (m.role ?? m.roleName) === 'admin' || !!m.isCreator,
    joinedAt: m.joined_at ?? m.joinedAt ?? null,
    isMe: !!m.isMe,
  })),
  // Still not returned by the API — the Home/Rooms cards degrade gracefully
  // (no badge, empty progress bar) until unread counts and group progress exist.
  unreadCount: room.unread_count || 0,
  groupProgressPct: room.group_progress_pct ?? 0,
  status: room.status || null,
});

// Fixture used by the Home/Rooms redesign (1a/1c) so the screens have
// something meaningful to show before a user has joined a real room, or
// while the backend doesn't yet return members/unreadCount/groupProgressPct.

const useRoomStore = create((set, get) => ({
  rooms: [],
  activeRoom: null,
  participants: [],
  loading: false,
  // Set once the first fetch has settled (success or not) so Home can tell
  // "this reader has no rooms" — which is a state it renders, see
  // FIRST_RUN_3a_3b.md § 3a — from "we haven't asked yet".
  roomsLoaded: false,

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
      set({ loading: false, roomsLoaded: true });
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

  // GET /room/{id} — the whole Room Detail payload (members, current book,
  // bucket). Merged into `rooms` so every screen sees the richer record.
  fetchRoomDetail: async (roomId) => {
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl(`/room/${roomId}`),
      );

      if (status === 200) {
        const detail = normalizeRoom(response);
        set((state) => ({
          rooms: state.rooms.some((r) => r.id === detail.id)
            ? state.rooms.map((r) => (r.id === detail.id ? { ...r, ...detail } : r))
            : [...state.rooms, detail],
          activeRoom: detail,
        }));
        return { status: 200, response: detail };
      }
      log.error('Failed to fetch room detail:', response);
      return { status: status || 500, error: response?.error || 'Failed to load room' };
    } catch (error) {
      log.error('Error fetching room detail:', error);
      return { status: 500, error: error.message || 'Network error' };
    }
  },

  // POST /room/join — join by invite code.
  joinRoomByCode: async (inviteCode) => {
    const code = (inviteCode || '').trim().toUpperCase();
    if (!code) {
      return { status: 400, error: 'Enter an invite code' };
    }

    try {
      const { status, response } = await makeAuthenticatedPostRequest(
        getBackendUrl('/room/join'),
        { invite_code: code },
      );

      if (status === 200 || status === 201) {
        const joined = normalizeRoom(response);
        log.info('Joined room:', joined.name);
        set((state) => ({
          rooms: state.rooms.some((r) => r.id === joined.id)
            ? state.rooms.map((r) => (r.id === joined.id ? { ...r, ...joined } : r))
            : [...state.rooms, joined],
        }));
        return { status: 200, response: joined };
      }

      // The API distinguishes these, so the UI can say something useful.
      const message = status === 404
        ? 'No room found for that code'
        : status === 409
          ? 'You\'re already in this room'
          : response?.error || 'Could not join that room';
      return { status: status || 500, error: message };
    } catch (error) {
      log.error('Error joining room:', error);
      return { status: 500, error: error.message || 'Network error' };
    }
  },

  // PATCH /room/{id}/reading — set what the room reads (a standalone book, or
  // a book from a bucket). Creator-only, and the API enforces the invariant
  // that a current book belongs to the bucket. Applied optimistically, then
  // reconciled with the room the API returns.
  setRoomReading: async (roomId, { bucket = null, currentBook = null }) => {
    log.info('Setting room reading:', { roomId, bucket: bucket?.name, book: currentBook?.title });

    const previous = get().rooms;
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
            ...room,
            bucket,
            currentBook,
            currentBookTitle: currentBook?.title || null,
            coverUrl: currentBook?.cover_image_url || null,
          }
          : room,
      ),
    }));

    try {
      const { status, response } = await makeAuthenticatedPatchRequest(
        getBackendUrl(`/room/${roomId}/reading`),
        {
          current_book_id: currentBook?.book_id ?? currentBook?.id ?? null,
          bucket_id: bucket?.id ?? null,
          bucket_type: bucket?.type ?? (bucket ? 'user' : null),
        },
      );

      if (status === 200) {
        const detail = normalizeRoom(response);
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === detail.id ? { ...r, ...detail } : r)),
          activeRoom: state.activeRoom?.id === detail.id ? detail : state.activeRoom,
        }));
        return { status: 200, response: detail };
      }

      log.error('Failed to set room reading, reverting:', response);
      set({ rooms: previous });
      return { status: status || 500, error: response?.error || 'Could not update the room' };
    } catch (error) {
      log.error('Error setting room reading, reverting:', error);
      set({ rooms: previous });
      return { status: 500, error: error.message || 'Network error' };
    }
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

  // DELETE /room/{id} — creator only. Members cascade with the room.
  deleteRoom: async (roomId) => {
    const previous = get().rooms;
    // Optimistic: the screen navigates away as soon as this resolves.
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
      activeRoom: state.activeRoom?.id === roomId ? null : state.activeRoom,
    }));

    try {
      const { status, response } = await makeAuthenticatedDeleteRequest(
        getBackendUrl(`/room/${roomId}`),
      );

      if (status === 200 || status === 204) {
        log.info('Room deleted:', roomId);
        return { status: 204 };
      }

      log.error('Failed to delete room, reverting:', response);
      set({ rooms: previous });
      return {
        status: status || 500,
        error: status === 403
          ? 'Only the room creator can delete this room'
          : response?.error || 'Could not delete the room',
      };
    } catch (error) {
      log.error('Error deleting room, reverting:', error);
      set({ rooms: previous });
      return { status: 500, error: error.message || 'Network error' };
    }
  },

  // DELETE /room/{id}/members/me — for members who aren't the creator.
  leaveRoom: async (roomId) => {
    const previous = get().rooms;
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
      activeRoom: state.activeRoom?.id === roomId ? null : state.activeRoom,
      participants: [],
    }));

    try {
      const { status, response } = await makeAuthenticatedDeleteRequest(
        getBackendUrl(`/room/${roomId}/members/me`),
      );

      if (status === 200 || status === 204) {
        log.info('Left room:', roomId);
        return { status: 204 };
      }

      log.error('Failed to leave room, reverting:', response);
      set({ rooms: previous });
      return {
        status: status || 500,
        error: status === 403
          ? 'Delete the room instead — you created it'
          : response?.error || 'Could not leave the room',
      };
    } catch (error) {
      log.error('Error leaving room, reverting:', error);
      set({ rooms: previous });
      return { status: 500, error: error.message || 'Network error' };
    }
  },

  clearRooms: () => {
    set({ rooms: [], activeRoom: null, participants: [] });
  },
}));

export default useRoomStore;
