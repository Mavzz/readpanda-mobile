import { create } from 'zustand';
import log from '../utils/logger';
import { isNetworkError } from '../utils/apiError';
import { showToast } from '../components/Toaster';
import {
  fetchBookHighlights,
  createHighlight,
  deleteHighlight,
} from '../services/highlightsService';
import useOutboxStore, { registerOutboxHandlers } from './outboxStore';
import persistSlice from './persistSlice';

// Personal highlights, keyed by book. Private to the reader and not tied to a
// room, so solo books have them too.
//
// Writes are optimistic: a highlight is drawn the moment it's made and rolled
// back if the server refuses it. Each one carries a clientId minted here,
// which is also its stable `key` for the native reader — it doesn't change
// when the server's id arrives, so the page doesn't flicker on save.
//
// Offline, a write that can't reach the server isn't rolled back: it stays
// drawn, flagged `queued`, and the outbox sends it later
// (specs/offline-first R3). The highlights themselves are kept on the device
// for the books opened most recently, so the reader shows them offline (R4).

// How many books' highlights are kept on the device (R4.2).
const KEEP_BOOKS = 30;

const newClientId = () =>
  `hl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const toHighlight = (raw) => ({
  id: raw.id,
  clientId: raw.client_id || null,
  key: raw.client_id || raw.id,
  page: raw.page || 0,
  anchorText: raw.anchor_text || '',
  anchorBounds: raw.anchor_bounds || null,
  fileHash: raw.file_hash || '',
  pending: false,
});

const useHighlightsStore = create((set, get) => ({
  // { [bookId]: Highlight[] }
  byBook: {},
  // { [bookId]: when it was last loaded or written }, to keep the newest.
  seenAt: {},

  loadHighlights: async (bookId) => {
    try {
      const { status, response } = await fetchBookHighlights(bookId);
      if (status !== 200 || !Array.isArray(response)) {
        log.warn('Failed to load highlights:', status);
        return;
      }
      // Keep anything still being saved, here or in the outbox: a load that
      // lands mid-write would otherwise wipe a highlight the reader just made.
      // And leave out what the reader removed offline: the server still has
      // it until the outbox gets there (R3.10).
      const kept = (get().byBook[bookId] || []).filter((h) => h.pending || h.queued);
      const removing = new Set(useOutboxStore.getState().items
        .filter((i) => i.kind === 'highlight.remove' && i.bookId === bookId)
        .map((i) => i.ref));
      const loaded = response.map(toHighlight).filter((h) => !removing.has(h.id) && !removing.has(h.key));
      const loadedKeys = new Set(loaded.map((h) => h.key));
      set((state) => ({
        byBook: {
          ...state.byBook,
          [bookId]: [...loaded, ...kept.filter((h) => !loadedKeys.has(h.key))],
        },
        seenAt: { ...state.seenAt, [bookId]: Date.now() },
      }));
    } catch (error) {
      log.error('Error loading highlights:', error);
    }
  },

  // Throws if the server refuses the write, after rolling it back. Offline,
  // or with no answer, it's kept and queued instead.
  addHighlight: async ({ bookId, page, anchorText, anchorBounds, fileHash }) => {
    const clientId = newClientId();
    const optimistic = {
      id: null,
      clientId,
      key: clientId,
      page,
      anchorText,
      anchorBounds: anchorBounds || null,
      fileHash: fileHash || '',
      pending: true,
    };
    set((state) => ({
      byBook: { ...state.byBook, [bookId]: [...(state.byBook[bookId] || []), optimistic] },
      seenAt: { ...state.seenAt, [bookId]: Date.now() },
    }));

    const replace = (fn) => set((state) => ({
      byBook: { ...state.byBook, [bookId]: fn(state.byBook[bookId] || []) },
    }));

    let saved = null;
    let failure = null;
    try {
      const { status, response } = await createHighlight(bookId, {
        page,
        anchorText,
        anchorBounds,
        fileHash,
        clientId,
      }, { quiet: true });
      if (status === 200 || status === 201) {
        saved = { ...toHighlight(response), key: clientId };
      }
    } catch (error) {
      failure = error;
      if (!isNetworkError(error)) {
        log.error('Error saving highlight:', error);
      }
    }

    if (!saved && isNetworkError(failure)) {
      // Removed while this was trying: nothing to keep.
      if (!(get().byBook[bookId] || []).some((h) => h.key === clientId)) {
        return;
      }
      useOutboxStore.getState().enqueue({
        kind: 'highlight.add',
        bookId,
        ref: clientId,
        payload: { page, anchorText, anchorBounds: anchorBounds || null, fileHash: fileHash || '' },
      });
      replace((list) => list.map((h) => (h.key === clientId ? { ...h, pending: false, queued: true } : h)));
      return;
    }

    if (!saved) {
      replace((list) => list.filter((h) => h.key !== clientId));
      throw new Error('Could not save highlight');
    }

    // Removed while the save was in flight: the server copy exists now, so
    // finish the removal there instead of drawing it again.
    const current = (get().byBook[bookId] || []).find((h) => h.key === clientId);
    if (!current) {
      get().removeSaved(bookId, saved);
      return;
    }
    replace((list) => list.map((h) => (h.key === clientId ? saved : h)));
  },

  // Throws if the server refuses, after putting the highlight back. Offline,
  // the removal is queued and the highlight stays gone.
  removeHighlight: async (bookId, key) => {
    const list = get().byBook[bookId] || [];
    const target = list.find((h) => h.key === key);
    if (!target) {
      return;
    }
    set((state) => ({
      byBook: { ...state.byBook, [bookId]: (state.byBook[bookId] || []).filter((h) => h.key !== key) },
    }));

    // Waiting in the outbox: the outbox drops the add, or queues the removal
    // behind it if it's being sent right now.
    if (target.queued) {
      useOutboxStore.getState().enqueue({
        kind: 'highlight.remove',
        bookId,
        ref: target.clientId,
        payload: { highlight: { ...target, queued: false } },
      });
      return;
    }

    // Still saving: addHighlight sees it's gone and deletes the server copy.
    if (!target.id) {
      return;
    }

    await get().removeSaved(bookId, target, { restore: true });
  },

  // DELETE a highlight the server has. With no answer it's queued; refused,
  // it's put back (when `restore`) and this throws.
  removeSaved: async (bookId, target, { restore = false } = {}) => {
    let ok = false;
    try {
      const { status } = await deleteHighlight(target.id, { quiet: true });
      ok = status === 204 || status === 200;
    } catch (error) {
      if (isNetworkError(error)) {
        useOutboxStore.getState().enqueue({
          kind: 'highlight.remove',
          bookId,
          ref: target.id,
          payload: { highlight: target },
        });
        return;
      }
      // apiService throws on every 4xx. A 404 means it's already gone —
      // removed on another device — which is the outcome we wanted.
      ok = /Client error 404/.test(error?.message || '');
      if (!ok) {
        log.error('Error removing highlight:', error);
      }
    }
    if (!ok && restore) {
      set((state) => ({
        byBook: { ...state.byBook, [bookId]: [...(state.byBook[bookId] || []), target] },
      }));
      throw new Error('Could not remove highlight');
    }
  },

  clearHighlights: () => set({ byBook: {}, seenAt: {} }),
}));

// Sending what the outbox kept. A highlight is found by its key, which is its
// clientId from the moment it was made.
const replaceIn = (bookId, fn) => useHighlightsStore.setState((state) => ({
  byBook: { ...state.byBook, [bookId]: fn(state.byBook[bookId] || []) },
}));

registerOutboxHandlers('highlight.add', {
  send: (item) => createHighlight(item.bookId, { ...item.payload, clientId: item.ref }, { quiet: true }),
  onAccepted: (item, result) => {
    if (!result?.response) {
      return;
    }
    const saved = { ...toHighlight(result.response), key: item.ref };
    replaceIn(item.bookId, (list) => list.map((h) => (h.key === item.ref ? saved : h)));
  },
  onRejected: (item) => {
    replaceIn(item.bookId, (list) => list.filter((h) => h.key !== item.ref));
    showToast('Couldn\'t save a highlight you made offline', 'error');
  },
});

registerOutboxHandlers('highlight.remove', {
  send: (item) => deleteHighlight(item.ref, { quiet: true }),
  // Refused: it's still on the server, so draw it again.
  onRejected: (item) => {
    const { highlight } = item.payload;
    replaceIn(item.bookId, (list) => (
      list.some((h) => h.key === highlight.key) ? list : [...list, highlight]
    ));
  },
});

// The 30 books seen most recently, so the store can't grow without bound.
const recentBooks = (byBook, seenAt) => {
  const keep = Object.keys(byBook)
    .sort((a, b) => (seenAt[b] || 0) - (seenAt[a] || 0))
    .slice(0, KEEP_BOOKS);
  return Object.fromEntries(keep.map((id) => [id, byBook[id]]));
};

// Highlights from last time, offline too (R4.1). A save that was mid-request
// when the app was killed is dropped: if it landed, the next load brings it
// back; queued ones are the outbox's and stay.
export const hydrateHighlights = persistSlice(useHighlightsStore, 'highlights', {
  pick: (s) => ({ byBook: recentBooks(s.byBook, s.seenAt), seenAt: s.seenAt }),
  restore: ({ byBook, seenAt }) => ({
    byBook: Object.fromEntries(Object.entries(byBook || {}).map(
      ([id, list]) => [id, list.filter((h) => !h.pending || h.queued)],
    )),
    seenAt: seenAt || {},
  }),
});

export default useHighlightsStore;
