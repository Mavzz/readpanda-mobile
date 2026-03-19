import { create } from 'zustand';
import log from '../utils/logger';
import enhanceedStorage from '../utils/enhanceedStorage';

const useReadingProgressStore = create((set, get) => ({
  currentBook: null,
  progress: {},
  recentBooks: [],

  setCurrentBook: (book) => {
    log.info('Setting current book:', book?.title);
    set({ currentBook: book });
  },

  saveProgress: (manuscriptId, progressData) => {
    log.info('Saving reading progress for:', manuscriptId);
    try {
      enhanceedStorage.saveReadingProgress(manuscriptId, progressData);
      set((state) => ({
        progress: {
          ...state.progress,
          [manuscriptId]: progressData,
        },
      }));
    } catch (e) {
      log.error('Failed to save reading progress:', e);
    }
  },

  loadProgress: (manuscriptId) => {
    const { progress } = get();
    return progress[manuscriptId] || null;
  },

  addToRecentBooks: (book) => {
    const { recentBooks } = get();
    const alreadyExists = recentBooks.some((b) => b.book_id === book.book_id);

    if (!alreadyExists) {
      const updated = [book, ...recentBooks].slice(0, 10);
      set({ recentBooks: updated });
      log.info('Added book to recent list:', book.title);
    }
  },

  clearProgress: () => {
    log.info('Clearing reading progress');
    set({ currentBook: null, progress: {}, recentBooks: [] });
  },
}));

export default useReadingProgressStore;
