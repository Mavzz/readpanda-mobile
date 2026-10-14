import readingHours, { bucketMeta, booksLabel, curatedMeta } from '../readingTime';
import relativeTime from '../relativeTime';
import bucketProgress from '../bucketProgress';
import { bookIdOf, sameId } from '../bookId';
import getInitials from '../getInitials';
import { selectedInterests, topInterest, seedCollection } from '../interests';

describe('readingTime', () => {
  it('says nothing when the length is unknown', () => {
    expect(readingHours(null)).toBeNull();
    expect(readingHours(0)).toBeNull();
  });

  it('rounds to whole hours, never below one', () => {
    expect(readingHours(10)).toBe('~1 hr');
    expect(readingHours(150)).toBe('~3 hrs');
  });

  it('builds bucket meta lines', () => {
    expect(booksLabel(1)).toBe('1 book');
    expect(bucketMeta(4, 300)).toBe('4 books · ~5 hrs');
    expect(bucketMeta(4, null)).toBe('4 books');
  });

  it('shows a partial genre match on curated tiles', () => {
    const bucket = { bookCount: 8, matchingCount: 3, readingMinutes: 120 };
    expect(curatedMeta(bucket, 'Fantasy')).toBe('3 of 8 are Fantasy');
    expect(curatedMeta({ ...bucket, matchingCount: 8 }, 'Fantasy')).toBe('8 books · ~2 hrs');
    expect(curatedMeta(bucket, null)).toBe('8 books · ~2 hrs');
  });
});

describe('relativeTime', () => {
  const NOW = new Date('2026-10-09T12:00:00Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [null, 'not opened yet'],
    [NOW - 5_000, 'just now'],
    [NOW + 60_000, 'just now'], // clock skew never reads as the future
    [NOW - 5 * 60_000, '5m ago'],
    [NOW - 3 * 3600_000, '3h ago'],
    [NOW - 30 * 3600_000, 'yesterday'],
    [NOW - 4 * 86400_000, '4d ago'],
  ])('%p → %p', (ts, want) => {
    expect(relativeTime(ts)).toBe(want);
  });

  it('falls back to a date after a week', () => {
    expect(relativeTime(NOW - 10 * 86400_000)).not.toMatch(/ago/);
  });
});

describe('bucketProgress', () => {
  it('is null for a book never opened', () => {
    expect(bucketProgress({}, undefined)).toBeNull();
  });

  it('prefers the shelf on this device over the server copy', () => {
    const book = { progress: { total_pages: 100, progress_pct: 10, current_page: 9, last_read_at: '2026-01-01' } };
    const shelf = { started: true, progressPct: 60, chapter: 61, lastReadAt: 5, roomName: 'Club' };
    expect(bucketProgress(book, shelf)).toMatchObject({ status: 'reading', pct: 60, page: 61, onShelf: true, roomName: 'Club' });
  });

  it('reads the server copy, 1-indexing the page', () => {
    const book = { progress: { total_pages: 100, progress_pct: 100, current_page: 99, last_read_at: '2026-01-01T00:00:00Z' } };
    expect(bucketProgress(book)).toMatchObject({
      status: 'finished',
      page: 100,
      onShelf: false,
      lastReadAt: Date.parse('2026-01-01T00:00:00Z'),
    });
  });

  it('is notStarted when the length is still unknown', () => {
    const book = { progress: { total_pages: 0, progress_pct: 0, current_page: 0 } };
    expect(bucketProgress(book).status).toBe('notStarted');
  });
});

describe('bookId', () => {
  it('reads either id shape', () => {
    expect(bookIdOf({ book_id: 'a' })).toBe('a');
    expect(bookIdOf({ id: 7 })).toBe(7);
    expect(bookIdOf(null)).toBeUndefined();
  });

  it('compares across number/string, but never matches two missing ids', () => {
    expect(sameId(7, '7')).toBe(true);
    expect(sameId('a', 'b')).toBe(false);
    expect(sameId(undefined, undefined)).toBe(false);
    expect(sameId(null, 'x')).toBe(false);
  });
});

describe('getInitials', () => {
  it.each([
    [null, '?'],
    ['', '?'],
    ['ada', 'AD'],
    ['Ada Lovelace', 'AL'],
    ['Ada King Lovelace', 'AL'],
    ['  Ada Lovelace  ', 'AL'],
  ])('%p → %p', (name, want) => {
    expect(getInitials(name)).toBe(want);
  });
});

describe('interests', () => {
  const prefs = {
    Fiction: [
      { preference_subgenre: 'Fantasy', preference_value: true },
      { preference_subgenre: 'Noir', preference_value: false },
    ],
    NonFiction: [{ preference_subgenre: 'History', preference_value: true }],
    junk: 'not an array',
  };

  it('lists only the picked subgenres', () => {
    expect(selectedInterests(prefs)).toEqual(['Fantasy', 'History']);
    expect(selectedInterests(null)).toEqual([]);
    expect(topInterest(prefs)).toBe('Fantasy');
    expect(topInterest({})).toBeNull();
  });

  it('seeds from the first curated bucket naming a pick', () => {
    const buckets = [{ name: 'Staff picks' }, { name: 'Epic fantasy' }];
    expect(seedCollection(buckets, prefs)).toEqual({ bucket: buckets[1], interest: 'Fantasy' });
  });

  it('falls back to the first bucket when nothing matches', () => {
    const buckets = [{ name: 'Staff picks' }];
    expect(seedCollection(buckets, prefs)).toEqual({ bucket: buckets[0], interest: 'Fantasy' });
    expect(seedCollection([], undefined)).toEqual({ bucket: null, interest: null });
  });
});
