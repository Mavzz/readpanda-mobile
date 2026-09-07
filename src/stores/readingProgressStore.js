import { create } from 'zustand';
import log from '../utils/logger';
import enhanceedStorage from '../utils/enhanceedStorage';

// Fixture used by the Home/Reading redesign (1a/1b) until the backend exposes
// room member pace. Matches the shape described in
// design_handoff_redesign/README.md ("State Management").
//
// There is deliberately no fixture *active book*: "no activeBook" is a real
// state the app has to render (FIRST_RUN_3a_3b.md § 3a/3b), so a reader who
// hasn't opened anything yet gets the first-run screens, not a phantom book.
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
  // Distinguishes "nothing read yet" from "haven't looked yet" so Home and
  // the Reading tab don't flash their first-run state before the last-read
  // position has been read back out of storage.
  activeBookLoaded: false,

  // Hydrates the Home hero / Reading tab from the real book the user last
  // opened (persisted with its cover_image_url by saveProgress). Leaves
  // activeBook null when nothing has been read — that's the 3a/3b first run.
  loadActiveBook: () => {
    const { activeBook } = get();
    if (activeBook) {
      set({ activeBookLoaded: true });
      return;
    }

    try {
      const lastRead = enhanceedStorage.getCurrentReadingPosition();
      const book = lastRead?.book;
      if (book?.title) {
        const currentPage = lastRead.progress?.currentPage || 0;
        const totalPages = lastRead.progress?.totalPages || 0;
        log.info('Restoring last-read book for Home/Reading:', book.title);
        set({
          activeBook: {
            id: book.book_id,
            title: book.title,
            coverUrl: book.cover_image_url,
            manuscriptUrl: book.manuscript_url,
            // The PDF reader knows pages, not chapters — say so rather than
            // presenting page counts as chapter counts.
            unit: 'page',
            chapter: currentPage + 1,
            totalChapters: totalPages,
            progressPct: totalPages ? Math.round(((currentPage + 1) / totalPages) * 100) : 0,
            roomName: null,
          },
          memberProgress: FIXTURE_MEMBER_PROGRESS,
          activeBookLoaded: true,
        });
        return;
      }
    } catch (e) {
      log.error('Failed to restore last-read book:', e);
    }

    log.info('No book read yet — Home/Reading render their first-run state');
    set({ activeBook: null, memberProgress: [], activeBookLoaded: true });
  },

  setCurrentBook: (book) => {
    log.info('Setting current book:', book?.title);
    set({ currentBook: book });
  },

  saveProgress: (manuscriptId, progressData, book = null) => {
    log.info('Saving reading progress for:', manuscriptId);
    try {
      enhanceedStorage.saveReadingProgress(manuscriptId, progressData, book);
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
    set({
      currentBook: null,
      progress: {},
      recentBooks: [],
      activeBook: null,
      memberProgress: [],
      activeBookLoaded: false,
    });
  },
}));

export default useReadingProgressStore;
