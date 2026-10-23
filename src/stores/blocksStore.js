import { create } from 'zustand';
import log from '../utils/logger';
import { blockUser, unblockUser, fetchBlocks } from '../services/safetyService';
import useCommentsStore from './commentsStore';
import useRoomStore from './roomStore';

// Who this reader has blocked (report-block R5, R6). The API does the
// hiding; this list is for Settings › Blocked readers, and blocking also
// clears that reader from what's already on screen.
const useBlocksStore = create((set, get) => ({
  blocked: [],
  loaded: false,

  fetch: async () => {
    try {
      const { status, response } = await fetchBlocks();
      if (status !== 200 || !Array.isArray(response)) {
        return { ok: false };
      }
      set({
        blocked: response.map((b) => ({ userId: b.user_id, username: b.username })),
        loaded: true,
      });
      return { ok: true };
    } catch (e) {
      log.error('Failed to load blocked readers:', e);
      return { ok: false };
    }
  },

  // Their comments leave every loaded book at once (R5.2), and they're
  // marked in member lists; the API answers the same from the next fetch.
  block: async ({ userId, username }) => {
    try {
      const { status } = await blockUser(userId);
      if (status !== 204 && status !== 200) {
        return { ok: false };
      }
    } catch (e) {
      log.error('Failed to block:', e);
      return { ok: false };
    }
    set((state) => ({
      blocked: [{ userId, username }, ...state.blocked.filter((b) => b.userId !== userId)],
    }));
    useCommentsStore.getState().dropAuthor(userId);
    useRoomStore.getState().setMemberBlocked(userId, true);
    return { ok: true };
  },

  // Their comments come back from the next load (R6.3).
  unblock: async (userId) => {
    try {
      const { status } = await unblockUser(userId);
      if (status !== 204 && status !== 200) {
        return { ok: false };
      }
    } catch (e) {
      log.error('Failed to unblock:', e);
      return { ok: false };
    }
    set((state) => ({ blocked: state.blocked.filter((b) => b.userId !== userId) }));
    useRoomStore.getState().setMemberBlocked(userId, false);
    return { ok: true };
  },

  isBlocked: (userId) => get().blocked.some((b) => b.userId === userId),

  clear: () => set({ blocked: [], loaded: false }),
}));

export default useBlocksStore;
