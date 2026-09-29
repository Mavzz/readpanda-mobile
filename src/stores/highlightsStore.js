import { create } from 'zustand';
import log from '../utils/logger';
import {
  fetchBookHighlights,
  createHighlight,
  deleteHighlight,
} from '../services/highlightsService';

// Personal highlights, keyed by book. Private to the reader and not tied to a
// room, so solo books have them too.
//
// Writes are optimistic: a highlight is drawn the moment it's made and rolled
// back if the server refuses it. Each one carries a clientId minted here,
// which is also its stable `key` for the native reader — it doesn't change
// when the server's id arrives, so the page doesn't flicker on save.

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

  loadHighlights: async (bookId) => {
    try {
      const { status, response } = await fetchBookHighlights(bookId);
      if (status !== 200 || !Array.isArray(response)) {
        log.warn('Failed to load highlights:', status);
        return;
      }
      // Keep anything still being saved: a load that lands mid-write would
      // otherwise wipe a highlight the reader just made.
      const pending = (get().byBook[bookId] || []).filter((h) => h.pending);
      const loaded = response.map(toHighlight);
      const loadedKeys = new Set(loaded.map((h) => h.key));
      set((state) => ({
        byBook: {
          ...state.byBook,
          [bookId]: [...loaded, ...pending.filter((h) => !loadedKeys.has(h.key))],
        },
      }));
    } catch (error) {
      log.error('Error loading highlights:', error);
    }
  },

  // Throws if the server refuses the write, after rolling it back.
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
    }));

    const replace = (fn) => set((state) => ({
      byBook: { ...state.byBook, [bookId]: fn(state.byBook[bookId] || []) },
    }));

    let saved = null;
    try {
      const { status, response } = await createHighlight(bookId, {
        page,
        anchorText,
        anchorBounds,
        fileHash,
        clientId,
      });
      if (status === 200 || status === 201) {
        saved = { ...toHighlight(response), key: clientId };
      }
    } catch (error) {
      log.error('Error saving highlight:', error);
    }

    if (!saved) {
      replace((list) => list.filter((h) => h.key !== clientId));
      throw new Error('Could not save highlight');
    }

    // Removed while the save was in flight: the server copy exists now, so
    // finish the removal there instead of drawing it again.
    const current = (get().byBook[bookId] || []).find((h) => h.key === clientId);
    if (!current) {
      deleteHighlight(saved.id).catch((error) => log.error('Error removing highlight:', error));
      return;
    }
    replace((list) => list.map((h) => (h.key === clientId ? saved : h)));
  },

  // Throws if the server refuses, after putting the highlight back.
  removeHighlight: async (bookId, key) => {
    const list = get().byBook[bookId] || [];
    const target = list.find((h) => h.key === key);
    if (!target) {
      return;
    }
    set((state) => ({
      byBook: { ...state.byBook, [bookId]: (state.byBook[bookId] || []).filter((h) => h.key !== key) },
    }));

    // Still saving: addHighlight sees it's gone and deletes the server copy.
    if (!target.id) {
      return;
    }

    let ok = false;
    try {
      const { status } = await deleteHighlight(target.id);
      ok = status === 204 || status === 200;
    } catch (error) {
      // apiService throws on every 4xx. A 404 means it's already gone —
      // removed on another device — which is the outcome we wanted.
      ok = /Client error 404/.test(error?.message || '');
      if (!ok) {
        log.error('Error removing highlight:', error);
      }
    }
    if (!ok) {
      set((state) => ({
        byBook: { ...state.byBook, [bookId]: [...(state.byBook[bookId] || []), target] },
      }));
      throw new Error('Could not remove highlight');
    }
  },

  clearHighlights: () => set({ byBook: {} }),
}));

export default useHighlightsStore;
