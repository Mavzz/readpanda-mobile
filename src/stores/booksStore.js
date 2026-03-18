import { create } from 'zustand';
import log from '../utils/logger';
import { fetchManuscripts } from '../services/bookService';

const useBooksStore = create((set) => ({
  books: [],
  filteredBooks: [],
  loading: false,
  refreshing: false,

  fetchBooks: async (showRefresh = false) => {
    if (showRefresh) {
      set({ refreshing: true });
    } else {
      set({ loading: true });
    }

    log.info('Fetching books');

    try {
      const { status, response } = await fetchManuscripts();

      if (status === 200) {
        log.info('Books fetched successfully:', response);
        const booksData = response.books || [];
        set({ books: booksData, filteredBooks: booksData });
      } else {
        log.error('Failed to fetch books:', response);
      }

      return { status, response };
    } catch (error) {
      log.error('Error fetching books:', error);
      return { status: null, error };
    } finally {
      set({ loading: false, refreshing: false });
    }
  },

  filterBooks: (searchResults) => {
    set({ filteredBooks: searchResults });
  },

  resetFilter: () => {
    set((state) => ({ filteredBooks: state.books }));
  },

  clearBooks: () => {
    set({ books: [], filteredBooks: [] });
  },
}));

export default useBooksStore;
