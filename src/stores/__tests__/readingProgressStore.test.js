// The reading-position store, against an in-memory stand-in for
// enhancedStorage (MMKV) and a mocked progress API.

jest.mock('../../utils/enhancedStorage', () => {
  let state = { lastBookId: null, books: {} };
  let profile = { username: 'me' };
  return {
    __esModule: true,
    default: {
      __reset: () => { state = { lastBookId: null, books: {} }; profile = { username: 'me' }; },
      getUserProfile: () => profile,
      getReadingPositions: () => state,
      getReadingPosition: (id) => state.books[id] || null,
      getCurrentReadingPosition: () => state.books[state.lastBookId] || null,
      saveReadingProgress: (id, progress, book) => {
        const existing = state.books[id];
        state = {
          lastBookId: id,
          books: { ...state.books, [id]: { manuscriptId: id, progress, book: book || existing?.book || null, timestamp: Date.now() } },
        };
      },
      // Like the real one: the newest entry becomes the last-read book.
      mergeReadingPosition: (id, progress, book, timestamp) => {
        const books = { ...state.books, [id]: { manuscriptId: id, progress, book, timestamp } };
        const newest = Object.values(books).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
        state = { lastBookId: newest.manuscriptId, books };
      },
    },
  };
});

jest.mock('../../services/progressService', () => ({
  putReadingProgress: jest.fn(() => Promise.resolve({ status: 200 })),
  fetchRoomProgress: jest.fn(),
  fetchMyProgress: jest.fn(),
}));

import enhancedStorage from '../../utils/enhancedStorage';
import { putReadingProgress, fetchRoomProgress, fetchMyProgress } from '../../services/progressService';
import useReadingProgressStore from '../readingProgressStore';

const store = () => useReadingProgressStore.getState();
const dune = { book_id: 'bk_dune', title: 'Dune', cover_image_url: 'c.png', manuscript_url: 'm.pdf' };

const initial = useReadingProgressStore.getState();
beforeEach(() => {
  enhancedStorage.__reset();
  useReadingProgressStore.setState(initial, true);
});

describe('readingProgressStore', () => {
  it('starts on the first-run state when nothing has been read', () => {
    store().loadActiveBook();
    expect(store().activeBook).toBeNull();
    expect(store().activeBookLoaded).toBe(true);
  });

  it('saving a position updates the hero and publishes it', () => {
    store().saveProgress('bk_dune', { currentPage: 39, totalPages: 200, lastReadAt: 1 }, dune);

    expect(store().activeBook).toMatchObject({ id: 'bk_dune', chapter: 40, totalChapters: 200, progressPct: 20, started: true });
    expect(store().shelf).toHaveLength(1);
    expect(putReadingProgress).toHaveBeenCalledWith('bk_dune', expect.objectContaining({ currentPage: 39, totalPages: 200 }));
  });

  // Must match progressPct in api-go/internal/handlers/progress.go, or a
  // reader's marker jumps when the server's number replaces the local one.
  it.each([
    [0, 0, 0],
    [0, 200, 1],
    [99, 200, 50],
    [199, 200, 100],
    [1, 3, 67],
  ])('progressPct(%i, %i) = %i, as the server computes it', (currentPage, totalPages, want) => {
    store().saveProgress('bk_dune', { currentPage, totalPages }, dune);
    expect(store().activeBook.progressPct).toBe(want);
  });

  it('a 0-page save does not erase a length already known', () => {
    store().saveProgress('bk_dune', { currentPage: 10, totalPages: 200 }, dune);
    store().saveProgress('bk_dune', { currentPage: 12, totalPages: 0 }, dune);
    expect(store().activeBook.totalChapters).toBe(200);
    expect(store().activeBook.started).toBe(true);
  });

  it('a failed publish never loses the local position', async () => {
    putReadingProgress.mockRejectedValueOnce(new Error('offline'));
    store().saveProgress('bk_dune', { currentPage: 5, totalPages: 100 }, dune);
    await Promise.resolve();
    expect(enhancedStorage.getReadingPosition('bk_dune').progress.currentPage).toBe(5);
  });

  it('startBook keeps the page of a part-read book', () => {
    store().saveProgress('bk_dune', { currentPage: 50, totalPages: 100 }, dune);
    useReadingProgressStore.setState({ activeBook: null, progress: {} });

    store().startBook(dune);
    expect(store().activeBook.chapter).toBe(51);
  });

  it('startBook rejects a book with no id or title', () => {
    expect(store().startBook({ title: 'No id' })).toBeNull();
    expect(store().activeBook).toBeNull();
  });

  it('puts other members on the pace track and keeps my own marker local', async () => {
    fetchRoomProgress.mockResolvedValue({
      status: 200,
      response: { book_id: 'bk_dune', members: [{ user_id: 'u-bob', progress_pct: 70 }, { user_id: 'u-me', progress_pct: 1 }] },
    });
    store().saveProgress('bk_dune', { currentPage: 49, totalPages: 100 }, dune);
    store().startBook(dune, {
      roomId: 'rm_1',
      roomName: 'Club',
      roomMembers: [
        { userId: 'u-me', initials: 'ME', isMe: true },
        { userId: 'u-bob', initials: 'BO', isMe: false },
        { userId: 'u-cat', initials: 'CA', isMe: false },
      ],
    });
    await new Promise(setImmediate);

    expect(store().memberProgress).toEqual([
      { userId: 'u-me', initials: 'ME', progressPct: 50, isMe: true }, // local, not the server's 1
      { userId: 'u-bob', initials: 'BO', progressPct: 70, isMe: false },
      { userId: 'u-cat', initials: 'CA', progressPct: 0, isMe: false }, // never opened it
    ]);
  });

  describe('syncFromServer', () => {
    const row = (overrides) => ({
      book_id: 'bk_dune',
      current_page: 80,
      total_pages: 100,
      last_read_at: '2026-10-01T00:00:00Z',
      book: { title: 'Dune' },
      ...overrides,
    });

    it('adopts a book this device has never seen', async () => {
      fetchMyProgress.mockResolvedValue({ status: 200, response: [row()] });
      await store().syncFromServer();
      expect(store().activeBook).toMatchObject({ id: 'bk_dune', chapter: 81 });
    });

    it('keeps the local position when it is newer', async () => {
      store().saveProgress('bk_dune', { currentPage: 10, totalPages: 100, lastReadAt: Date.parse('2026-10-05T00:00:00Z') }, dune);
      fetchMyProgress.mockResolvedValue({ status: 200, response: [row()] });
      await store().syncFromServer();
      expect(store().activeBook.chapter).toBe(11);
    });

    it('takes the server position when it is newer', async () => {
      store().saveProgress('bk_dune', { currentPage: 10, totalPages: 100, lastReadAt: Date.parse('2026-09-01T00:00:00Z') }, dune);
      fetchMyProgress.mockResolvedValue({ status: 200, response: [row()] });
      await store().syncFromServer();
      expect(store().activeBook.chapter).toBe(81);
    });

    it('ignores a failed fetch', async () => {
      store().saveProgress('bk_dune', { currentPage: 10, totalPages: 100 }, dune);
      fetchMyProgress.mockResolvedValue({ status: 500, response: null });
      await store().syncFromServer();
      expect(store().activeBook.chapter).toBe(11);
    });
  });
});
