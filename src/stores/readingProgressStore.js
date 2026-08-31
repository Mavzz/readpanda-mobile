import { create } from 'zustand';
import log from '../utils/logger';
import enhanceedStorage from '../utils/enhanceedStorage';

// Fixture used by the Home/Reading redesign (1a/1b) until the backend
// exposes per-book chapter progress + room member pace. Matches the shapes
// described in design_handoff_redesign/README.md ("State Management").
const FIXTURE_ACTIVE_BOOK = {
  id: 'fixture-midnight-library',
  title: 'The Midnight Library',
  coverUrl: null,
  chapter: 7,
  totalChapters: 21,
  progressPct: 62,
  roomName: 'Midnight Club',
};

const FIXTURE_MEMBER_PROGRESS = [
  { userId: 'me', initials: 'ME', progressPct: 62, isMe: true },
  { userId: 'priya', initials: 'PR', progressPct: 78 },
  { userId: 'tom', initials: 'TO', progressPct: 91 },
];

const useReadingProgressStore = create((set, get) => ({
  currentBook: null,
  progress: {},
  recentBooks: [],

  // ── "Tonight" (Home) / Reading tab fixtures ──────────────────────────
  // TODO: replace with real endpoints once member-progress + comment-anchor
  // APIs exist; shapes are already what those endpoints should return.
  activeBook: null,
  memberProgress: [],

  loadFixtureActiveBook: () => {
    const { activeBook } = get();
    if (activeBook) {
      return;
    }
    log.info('Loading fixture active book for Home/Reading redesign');
    set({ activeBook: FIXTURE_ACTIVE_BOOK, memberProgress: FIXTURE_MEMBER_PROGRESS });
  },

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
    if (progress[manuscriptId]) {
      return progress[manuscriptId];
    }
    // Try loading from persistent storage if not in memory
    try {
      const stored = enhanceedStorage.getCurrentReadingPosition();
      if (stored && stored.manuscriptId === manuscriptId) {
        return stored.progress;
      }
    } catch (e) {
      log.error('Failed to load reading progress:', e);
    }
    return null;
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
    set({ currentBook: null, progress: {}, recentBooks: [], activeBook: null, memberProgress: [] });
  },
}));

export default useReadingProgressStore;
