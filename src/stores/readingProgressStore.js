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

// Books reach us in two shapes: the manuscripts list uses `id`, everything
// that came through a bucket or a room uses `book_id`.
const bookIdOf = (book) => book?.book_id ?? book?.id;

// The record persisted alongside the reading position — just enough of the
// book for the Home hero and Reading tab to render it after a cold start.
const toStoredBook = (book, roomName = null, roomMembers = null) => ({
  book_id: bookIdOf(book),
  title: book?.title,
  cover_image_url: book?.cover_image_url || book?.coverUrl || null,
  manuscript_url: book?.manuscript_url || book?.manuscriptUrl || null,
  room_name: roomName,
  // Kept so the Reading tab's pace card can name the room's real members
  // after a cold start instead of falling back to the fixture.
  room_members: roomMembers,
});

// Pace for a book being read with a real room. The backend has no per-member
// progress yet, so everyone but me sits at 0 — an honest "nobody has recorded
// progress" rather than the invented pace the fixture shows.
const roomMemberProgress = (members, myProgressPct) => (members || []).map((m) => ({
  userId: m.userId,
  initials: m.initials,
  progressPct: m.isMe ? myProgressPct : 0,
  isMe: !!m.isMe,
}));

// The single shape the Home hero and Reading tab render, built the same way
// whether the book was just chosen in a room or restored from storage.
const toActiveBook = (book, progress = {}) => {
  const currentPage = progress.currentPage || 0;
  const totalPages = progress.totalPages || 0;
  return {
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
    // A book chosen in a room but not yet opened has no page count yet — the
    // screens say "Not started yet" rather than "Page 1 of 0".
    started: totalPages > 0,
    roomName: book.room_name || null,
    roomMembers: book.room_members || null,
  };
};

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
        log.info('Restoring last-read book for Home/Reading:', book.title);
        const restored = toActiveBook(book, lastRead.progress);
        set({
          activeBook: restored,
          memberProgress: book.room_members
            ? roomMemberProgress(book.room_members, restored.progressPct)
            : FIXTURE_MEMBER_PROGRESS,
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

  // Makes a book the active one before a single page has been read — the
  // bridge from "the room picked this book" (Room Detail) into the reading
  // loop, so the Home hero and Reading tab stop showing their first-run state.
  // Any progress already recorded for the book is carried over, so choosing a
  // book you'd part-read doesn't reset you to page one.
  startBook: (book, { roomName = null, roomMembers = null } = {}) => {
    const id = bookIdOf(book);
    if (!id || !book?.title) {
      log.error('startBook needs a book with an id and a title:', book);
      return null;
    }

    const stored = toStoredBook(book, roomName, roomMembers);
    const saved = get().loadProgress(id) || {};
    const progress = {
      currentPage: saved.currentPage || 0,
      totalPages: saved.totalPages || 0,
      lastReadAt: Date.now(),
    };

    log.info('Starting book:', stored.title, roomName ? `(with ${roomName})` : '');
    try {
      // Persisted the same way finishing a reading session is, so the choice
      // survives a cold start.
      enhanceedStorage.saveReadingProgress(id, progress, stored);
    } catch (e) {
      log.error('Failed to persist the chosen book:', e);
    }

    const active = toActiveBook(stored, progress);
    set({
      activeBook: active,
      // A book started in a room shows that room's real members. Only a book
      // with no room behind it falls back to the 1b demo fixture.
      memberProgress: roomMembers
        ? roomMemberProgress(roomMembers, active.progressPct)
        : FIXTURE_MEMBER_PROGRESS,
      activeBookLoaded: true,
    });
    return stored;
  },

  saveProgress: (manuscriptId, progressData, book = null) => {
    log.info('Saving reading progress for:', manuscriptId);
    try {
      const { activeBook } = get();
      // Keep the room the book was opened from — the reader doesn't know it.
      const sameBook = activeBook?.id === manuscriptId;
      const roomName = sameBook ? activeBook.roomName : null;
      const roomMembers = sameBook ? activeBook.roomMembers : null;
      const stored = book ? toStoredBook(book, roomName, roomMembers) : null;

      // Backing out of the reader before the PDF reports its length gives a
      // totalPages of 0. Don't let that erase a length we already knew and
      // send the hero back to "Not started yet".
      const known = sameBook ? activeBook.totalChapters : 0;
      const progress = progressData.totalPages > 0 || !known
        ? progressData
        : { ...progressData, totalPages: known };

      enhanceedStorage.saveReadingProgress(manuscriptId, progress, stored);
      set((state) => ({
        progress: {
          ...state.progress,
          [manuscriptId]: progress,
        },
        // Push the new position straight into the hero rather than waiting for
        // the next cold read of storage — Home and Reading stay mounted, so
        // without this they'd still show the position from before this session.
        activeBook: stored
          ? toActiveBook(stored, progress)
          : state.activeBook,
        activeBookLoaded: stored ? true : state.activeBookLoaded,
        // My own marker on the pace track moves with my progress.
        memberProgress: stored && roomMembers
          ? roomMemberProgress(roomMembers, toActiveBook(stored, progress).progressPct)
          : state.memberProgress,
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
