import { create } from 'zustand';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest, makeAuthenticatedPostRequest, makeAuthenticatedPatchRequest, makeAuthenticatedDeleteRequest } from '../services/authenticatedRequests';
import useReadingProgressStore from './readingProgressStore';
import enhancedStorage from '../utils/enhancedStorage';
import getInitials from '../utils/getInitials';
import { bookIdOf } from '../utils/bookId';
import persistSlice from './persistSlice';

// GET /room/my-rooms and GET /room/{id} return members as
// { user_id, username, role, joined_at, progress_pct }. The API doesn't flag
// which one is me, so match on username the way Room Detail does; me first,
// per the room card design.
const normalizeMembers = (members) => {
  const me = enhancedStorage.getUserProfile()?.username || null;
  return (members || [])
    .map((m) => {
      const name = m.username ?? m.name;
      return {
        userId: m.user_id ?? m.userId,
        name,
        initials: m.initials || getInitials(name || ''),
        isCreator: (m.role ?? m.roleName) === 'admin' || !!m.isCreator,
        joinedAt: m.joined_at ?? m.joinedAt ?? null,
        isMe: !!m.isMe || (!!me && name === me),
        progressPct: m.progress_pct ?? m.progressPct ?? 0,
      };
    })
    .sort((a, b) => Number(b.isMe) - Number(a.isMe));
};

// apiService throws "Client error 403: …" for a 4xx instead of returning
// the status; this gets it back. Null for a network error.
const statusOfError = (error) => {
  const match = /Client error (\d{3})/.exec(error?.message || '');
  return match ? Number(match[1]) : null;
};

const normalizeRoom = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description,
  isPrivate: room.is_private,
  inviteCode: room.invite_code,
  createdAt: room.created_at,
  updatedAt: room.updated_at,
  adminId: room.admin_id,
  // GET /room/{id} (and /room/join, which returns the same) nests the book
  // rather than flattening its id. Without the fallback, merging a detail into
  // `rooms` wiped the id the list had and Home lost track of the room's book.
  currentBookId: room.current_book_id ?? room.current_book?.book_id ?? null,
  currentBucketId: room.current_bucket_id,
  currentBookTitle: room.current_book?.title || room.current_book_title || null,
  coverUrl: room.current_book?.cover_image_url || room.current_book_cover_url || null,
  // A room reads EITHER a standalone book OR a bucket (a shared reading list)
  // with a current book chosen from it — ROOM_DETAIL_2a-2.md. Invariant:
  // bucket set ⇒ currentBook ∈ bucket; progress/comments key on currentBook.
  // GET /room/{id} returns bucket as { id, name, type, books[] }.
  bucket: room.bucket || null,
  currentBook: room.current_book || null,
  members: normalizeMembers(room.members),
  // Unread counts aren't returned by the API yet — the cards show no badge.
  unreadCount: room.unread_count || 0,
  groupProgressPct: room.group_progress_pct ?? 0,
  status: room.status || null,
  // The room's reading schedule ({ target_page, due_at, start_page }) — what
  // the deadline widgets count down to (WIDGETS_13a_13f.md 13b). The API
  // doesn't send one yet; until it does, the widgets show their solo faces.
  schedule: room.schedule || null,
});

// GET /room/open returns rooms as someone outside them sees them: no invite
// code or members, just enough for the card and the preview.
const normalizeOpenRoom = (room) => ({
  id: room.id,
  name: room.name,
  description: room.description || '',
  currentBookTitle: room.current_book?.title || null,
  coverUrl: room.current_book?.cover_image_url || null,
  memberCount: room.member_count ?? 0,
  creatorName: room.creator_username || null,
});

// After either kind of join: the room joins `rooms`, and its book is adopted
// (or picked back up) the way joining by code always has.
const afterJoin = async (response, set, get) => {
  const joined = normalizeRoom(response);
  log.info('Joined room:', joined.name);
  set((state) => ({
    rooms: state.rooms.some((r) => r.id === joined.id)
      ? state.rooms.map((r) => (r.id === joined.id ? { ...r, ...joined } : r))
      : [...state.rooms, joined],
  }));
  // Joining a room that is already reading something is an unambiguous
  // signal: adopt its book if the reader has none, or pick the room's
  // social layer back up if they're already reading it on their own.
  //
  // The join returns the full Room Detail, book included. An older API
  // returned only the room row — no book, so nothing to adopt — and the
  // join must still land, so ask for the detail in that case.
  let room = joined;
  if (!room.currentBookId) {
    const detail = await get().fetchRoomDetail(joined.id);
    if (detail.status === 200) {
      room = detail.response;
    }
  }
  useReadingProgressStore.getState().attachRoom(room, { adopt: true });
  return joined;
};

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
        // A room one of the tracked books was attached to may have disappeared
        // while this device wasn't looking. This is the catch-all the
        // delete/leave hooks below can't cover.
        useReadingProgressStore.getState().reconcileRooms(normalizedRooms);
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
      // Invite only unless the creator chose Open: no room becomes findable
      // by accident.
      is_private: roomData.isPrivate ?? roomData.is_private ?? true,
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
        // Re-attach only (no adopt): opening a room's page shouldn't put its
        // book on your nightstand, but if you're already reading that book on
        // your own, this is where the room's pace and comments come back.
        useReadingProgressStore.getState().attachRoom(detail);
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
        const joined = await afterJoin(response, set, get);
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

  // GET /room/open — open rooms the reader isn't in, optionally only those
  // reading bookId. Not kept in the store: the Rooms tab, See all and Book
  // detail each hold their own list, so one book's rooms can't replace the
  // tab's.
  fetchOpenRooms: async ({ bookId, limit = 20, offset = 0 } = {}) => {
    const query = `limit=${limit}&offset=${offset}${bookId ? `&book_id=${encodeURIComponent(bookId)}` : ''}`;
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl(`/room/open?${query}`),
      );
      if (status === 200) {
        return {
          status: 200,
          rooms: (response?.rooms || []).map(normalizeOpenRoom),
          hasMore: !!response?.has_more,
        };
      }
      log.error('Failed to fetch open rooms:', response);
      return { status: status || 500, rooms: [], hasMore: false };
    } catch (error) {
      log.error('Error fetching open rooms:', error);
      return { status: 500, rooms: [], hasMore: false };
    }
  },

  // POST /room/{id}/join — join an open room, no code. The preview it was
  // tapped from can be stale, so the API's answers become things to say.
  joinOpenRoom: async (roomId) => {
    let status;
    let response;
    try {
      ({ status, response } = await makeAuthenticatedPostRequest(
        getBackendUrl(`/room/${roomId}/join`),
        {},
        // A tap waiting on a spinner: say so now rather than after retries.
        { maxRetries: 0 },
      ));
    } catch (error) {
      // apiService throws on a 4xx rather than returning it.
      status = statusOfError(error);
      if (!status) {
        log.error('Error joining open room:', error);
      }
    }

    if (status === 200 || status === 201) {
      const joined = await afterJoin(response, set, get);
      return { status: 200, response: joined };
    }
    // Already in it: the caller opens the room instead.
    if (status === 409) {
      return { status: 409, already: true };
    }
    if (status === 403) {
      return { status, error: 'This room is invite-only now' };
    }
    if (status === 404) {
      return { status, error: 'This room is gone' };
    }
    return { status: status || 500, error: 'Couldn\'t join that room. Try again.' };
  },

  // PATCH /room/{id} — who can join. Creator-only. Shown at once, and put
  // back if the API says no.
  setRoomPrivacy: async (roomId, isPrivate) => {
    const apply = (value) => set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, isPrivate: value } : r)),
      activeRoom: state.activeRoom?.id === roomId
        ? { ...state.activeRoom, isPrivate: value }
        : state.activeRoom,
    }));
    const previous = get().rooms.find((r) => r.id === roomId)?.isPrivate;
    apply(isPrivate);

    try {
      const { status, response } = await makeAuthenticatedPatchRequest(
        getBackendUrl(`/room/${roomId}`),
        { is_private: isPrivate },
        // It's already shown as changed; a failure should put it back now,
        // not after the retries' backoff.
        { maxRetries: 0 },
      );
      if (status === 200) {
        const detail = normalizeRoom(response);
        set((state) => ({
          rooms: state.rooms.map((r) => (r.id === detail.id ? { ...r, ...detail } : r)),
          activeRoom: state.activeRoom?.id === detail.id ? detail : state.activeRoom,
        }));
        return { status: 200, response: detail };
      }
      log.error('Failed to change who can join, reverting:', response);
      apply(previous);
      return { status: status || 500, error: 'Couldn\'t change who can join' };
    } catch (error) {
      log.error('Error changing who can join, reverting:', error);
      apply(previous);
      return { status: 500, error: 'Couldn\'t change who can join' };
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
          current_book_id: bookIdOf(currentBook) ?? null,
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
    // Captured before the optimistic removal below — detachRoom needs the name
    // to match reading positions persisted before rooms carried an id.
    const goneName = previous.find((r) => r.id === roomId)?.name || null;
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
        // The reader may be part-way through this room's book. Keep the book
        // and the progress, drop the room around it — see detachRoom. Done
        // only on success, since a failed delete reverts below.
        useReadingProgressStore.getState().detachRoom(roomId, goneName);
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
    const goneName = previous.find((r) => r.id === roomId)?.name || null;
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
        // Leaving costs you the room, not your place in its book.
        useReadingProgressStore.getState().detachRoom(roomId, goneName);
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
    // roomsLoaded too, so the next account's Home waits for its own fetch
    // before deciding between the first-run and room states.
    set({ rooms: [], activeRoom: null, participants: [], roomsLoaded: false });
  },
}));

// Last launch's rooms show at once, and count as loaded only if there were
// some: an empty list could be a stale "no rooms yet", so Home still waits
// for the fetch before showing the first-run state.
export const hydrateRooms = persistSlice(useRoomStore, 'rooms', {
  pick: (s) => ({ rooms: s.rooms }),
  restore: ({ rooms }) => ({ rooms: rooms || [], roomsLoaded: (rooms || []).length > 0 }),
});

export default useRoomStore;
