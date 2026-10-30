import StorageService from '../services/storageService';
import { getStore, getTokens, setTokens, clearTokens } from '../services/secureStorage';
import { STORAGE_CATEGORIES } from '../constants/storageConstants';

// A save more than this many pages past the last one is a jump (the
// scrubber, a deep link), not pages read.
const MAX_PAGES_PER_SAVE = 30;

// "2026-09-30" in the reader's own timezone — a streak is about their days,
// not UTC's.
export const localDay = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

class EnhancedStorage {
  // Auth: tokens in the Keychain (see secureStorage), the profile in MMKV.
  storeAuthData(authData) {
    setTokens({ token: authData.token, refreshToken: authData.refreshToken });
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE, authData.userDetails);
  }

  getAuthData() {
    const token = this.getAuthToken();
    const userProfile = this.getUserProfile();
    const refreshToken = this.getRefreshToken();

    return {
      token,
      userProfile,
      refreshToken,
    };
  }

  getAuthToken() {
    return getTokens().token;
  }

  getUserProfile() {
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE);
  }

  getRefreshToken() {
    return getTokens().refreshToken;
  }

  updateAuthToken(newToken) {
    setTokens({ token: newToken });
  }

  updateRefreshToken(newRefreshToken) {
    setTokens({ refreshToken: newRefreshToken });
  }

  updateUserProfile(updates) {
    const currentProfile = this.getUserProfile();
    if (!currentProfile) return;

    const updatedProfile = { ...currentProfile, ...updates };
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE, updatedProfile);
  }

  clearAuthData() {
    clearTokens();
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE);
  }

  // Everything below the auth keys belongs to ONE account. Two people signing
  // into the same device must not share a reading position or a cached
  // recommendation, so those keys carry the username. The auth keys
  // themselves stay global — they're what identifies the current account.
  scopedKey(key) {
    const username = this.getUserProfile()?.username;
    return username ? `${key}::${username}` : key;
  }

  // Every key stored for one account on this device. Signing out keeps them,
  // so a reader who comes back picks up where they were; a deleted account
  // must not, or whoever next signs in with the same username inherits its
  // books (account-deletion R3.1).
  clearAccountData(username) {
    if (!username) {
      return;
    }
    const suffix = `::${username}`;
    getStore().getAllKeys()
      .filter((key) => key.endsWith(suffix))
      .forEach((key) => getStore().delete(key));
  }

  // A username change: everything the account stored under its old name moves
  // to the new one, so nothing is lost (specs/coming-soon R5.4). Run before the
  // profile switches name, while both are known.
  renameAccountData(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
      return;
    }
    const suffix = `::${oldName}`;
    const store = getStore();
    store.getAllKeys()
      .filter((key) => key.endsWith(suffix))
      .forEach((key) => {
        const value = store.getString(key);
        if (value !== undefined) {
          store.set(`${key.slice(0, -suffix.length)}::${newName}`, value);
        }
        store.delete(key);
      });
  }

  // App preferences (MMKV)
  storeUserPreference(key, value) {
    StorageService.setItem(this.scopedKey(`pref_${key}`), value);
  }

  getUserPreference(key, defaultValue = null) {
    return StorageService.getItem(this.scopedKey(`pref_${key}`)) ?? defaultValue;
  }

  // ── Reading positions (MMKV) ────────────────────────────────────────
  // One entry per book, keyed by book id, plus a pointer at the one read most
  // recently. This used to be a single slot, so opening a second book erased
  // the first one's position — the row survived in SQLite, but nothing ever
  // read it back, and reopening the first book restarted it at page one.
  readingPositionsKey() {
    return this.scopedKey(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION);
  }

  getReadingPositions() {
    const stored = StorageService.getItem(this.readingPositionsKey());
    if (!stored) {
      return { lastBookId: null, books: {} };
    }
    // Positions written by the single-slot version read as one entry, so an
    // upgrade keeps the book the reader was on rather than losing it.
    if (stored.manuscriptId) {
      return {
        lastBookId: stored.manuscriptId,
        books: { [stored.manuscriptId]: stored },
      };
    }
    return { lastBookId: stored.lastBookId || null, books: stored.books || {} };
  }

  saveReadingProgress(manuscriptId, progress, book = null) {
    // `book` carries just enough of the manuscript (title/cover/url) for
    // Home's "Continue reading" hero and the Reading tab to show the real
    // book — including its real cover image — after a cold start.
    const { books } = this.getReadingPositions();
    const existing = books[manuscriptId];
    const entry = {
      manuscriptId,
      progress,
      // A save that doesn't carry the book keeps what we already knew about
      // it, rather than blanking the hero's title and cover.
      book: book
        ? {
          book_id: book.book_id,
          title: book.title,
          cover_image_url: book.cover_image_url || null,
          manuscript_url: book.manuscript_url || null,
          // The room the book is being read with, when it was chosen in one,
          // and its members — so the Reading tab's pace card can name real
          // people after a cold start instead of the demo fixture. The id is
          // what lets a deleted or left room find the books it was attached to.
          room_id: book.room_id || null,
          room_name: book.room_name || null,
          room_members: book.room_members || null,
          // "This book explicitly has no room" — set once its room is gone.
          // Distinguishes that from "never had one", which gets the fixture.
          solo: !!book.solo,
        }
        : existing?.book || null,
      timestamp: Date.now(),
    };

    StorageService.setItem(this.readingPositionsKey(), {
      lastBookId: manuscriptId,
      books: { ...books, [manuscriptId]: entry },
    });
    this.recordReadingDay();
    this.recordPagesRead((progress?.currentPage ?? 0) - (existing?.progress?.currentPage ?? 0));
  }

  // ── Reading days (the widget's streak flame) ─────────────────────────
  // The local days a position was saved on, newest last, capped so it can't
  // grow without bound. A streak is consecutive days ending today — or
  // yesterday, since a day you haven't read *yet* shouldn't break it.
  readingDaysKey() {
    return this.scopedKey('reading_days');
  }

  recordReadingDay(date = new Date()) {
    const day = localDay(date);
    const days = StorageService.getItem(this.readingDaysKey()) || [];
    if (days[days.length - 1] === day) {
      return;
    }
    StorageService.setItem(this.readingDaysKey(), [...days.filter((d) => d !== day), day].slice(-60));
  }

  // The local days read on, newest last (Home's "Your week" dots, 16a).
  getReadingDays() {
    return StorageService.getItem(this.readingDaysKey()) || [];
  }

  // ── Pages per day (Home's "47 pages this week", 16a) ─────────────────
  // Pages moved forward through, per local day. Only small forward steps
  // count: going back, or a scrubber jump across half the book, isn't reading.
  // Two weeks are kept; the week is all that's shown.
  readingPagesKey() {
    return this.scopedKey('reading_pages');
  }

  recordPagesRead(pages, date = new Date()) {
    if (!(pages > 0) || pages > MAX_PAGES_PER_SAVE) {
      return;
    }
    const day = localDay(date);
    const all = StorageService.getItem(this.readingPagesKey()) || {};
    const kept = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)).slice(-13));
    StorageService.setItem(this.readingPagesKey(), { ...kept, [day]: (all[day] || 0) + pages });
  }

  // Pages read on the last `days` local days, today included. null when
  // nothing has been counted yet, so the copy can leave the number out
  // rather than claim 0.
  getPagesRead(days = 7, now = new Date()) {
    const all = StorageService.getItem(this.readingPagesKey());
    if (!all || Object.keys(all).length === 0) {
      return null;
    }
    let total = 0;
    const cursor = new Date(now);
    for (let i = 0; i < days; i += 1) {
      total += all[localDay(cursor)] || 0;
      cursor.setDate(cursor.getDate() - 1);
    }
    return total;
  }

  getReadingStreak(now = new Date()) {
    const days = new Set(StorageService.getItem(this.readingDaysKey()) || []);
    const cursor = new Date(now);
    if (!days.has(localDay(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }
    let streak = 0;
    while (days.has(localDay(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  // ── Chapters (the widgets' "Ch. 2") ───────────────────────────────────
  // The first page (0-based) of each chapter, as the reader found it in the
  // PDF's outline. Kept per book apart from the position, so a save that
  // rewrites the position can't drop it.
  bookChaptersKey() {
    return this.scopedKey('book_chapters');
  }

  setBookChapters(bookId, chapters) {
    const all = StorageService.getItem(this.bookChaptersKey()) || {};
    const next = Array.isArray(chapters) && chapters.length >= 2 ? chapters : null;
    if (JSON.stringify(all[bookId] || null) === JSON.stringify(next)) {
      return;
    }
    const updated = { ...all };
    if (next) {
      updated[bookId] = next;
    } else {
      delete updated[bookId];
    }
    StorageService.setItem(this.bookChaptersKey(), updated);
  }

  getBookChapters(bookId) {
    return (StorageService.getItem(this.bookChaptersKey()) || {})[bookId] || null;
  }

  // ── Reading pace (the widgets' "3 h left") ────────────────────────────
  // Running totals of time spent on pages the reader actually read through,
  // halved whenever they get large so the pace follows how they read now.
  readingPaceKey() {
    return this.scopedKey('reading_pace');
  }

  recordReadingPace(seconds, pages) {
    if (!(seconds > 0) || !(pages > 0)) {
      return;
    }
    const pace = StorageService.getItem(this.readingPaceKey()) || { seconds: 0, pages: 0 };
    let next = { seconds: pace.seconds + seconds, pages: pace.pages + pages };
    if (next.pages > 400) {
      next = { seconds: next.seconds / 2, pages: next.pages / 2 };
    }
    StorageService.setItem(this.readingPaceKey(), next);
  }

  // Minutes per page, or null until there are enough pages to say honestly.
  getPaceMinPerPage() {
    const pace = StorageService.getItem(this.readingPaceKey());
    if (!pace || pace.pages < 10) {
      return null;
    }
    return pace.seconds / 60 / pace.pages;
  }

  getCurrentReadingPosition() {
    const { lastBookId, books } = this.getReadingPositions();
    return (lastBookId && books[lastBookId]) || null;
  }

  getReadingPosition(bookId) {
    return this.getReadingPositions().books[bookId] || null;
  }

  // Rewrites just the stored *book* record for one position — which room it
  // belongs to, mainly. Deliberately leaves the progress alone and does not
  // move the "read most recently" pointer: detaching a room from a book you
  // aren't currently reading must not promote it onto the hero.
  updateReadingPositionBook(bookId, fields) {
    const { lastBookId, books } = this.getReadingPositions();
    const entry = books[bookId];
    if (!entry) {
      return;
    }
    StorageService.setItem(this.readingPositionsKey(), {
      lastBookId,
      books: { ...books, [bookId]: { ...entry, book: { ...entry.book, ...fields } } },
    });
  }

  // Takes a position read on another device. Unlike saveReadingProgress it
  // keeps the server's time rather than stamping "now" — otherwise a book
  // last read a week ago elsewhere would jump to the front of the shelf — and
  // skips the SQLite queue, since this position came *from* the server. The
  // "read most recently" pointer follows whichever entry is now newest.
  mergeReadingPosition(bookId, progress, book, timestamp) {
    const { books } = this.getReadingPositions();
    const merged = {
      ...books,
      [bookId]: { manuscriptId: bookId, progress, book, timestamp },
    };
    const newest = Object.values(merged)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
    StorageService.setItem(this.readingPositionsKey(), {
      lastBookId: newest?.manuscriptId || bookId,
      books: merged,
    });
  }

  // Forgets one book's position — used when the only reason the app was
  // tracking it was a room that has since been deleted or left.
  clearReadingPosition(bookId) {
    const { lastBookId, books } = this.getReadingPositions();
    if (!books[bookId]) {
      return;
    }
    const remaining = { ...books };
    delete remaining[bookId];
    // Dropping the book the pointer named hands the hero to whatever was read
    // most recently before it, rather than leaving Home with nothing.
    const nextLast = lastBookId === bookId
      ? Object.values(remaining)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0]?.manuscriptId || null
      : lastBookId;
    StorageService.setItem(this.readingPositionsKey(), { lastBookId: nextLast, books: remaining });
  }

  // ── Last-seen server data (MMKV) ─────────────────────────────────────
  // What a screen showed last time, so a cold start renders it at once and
  // the network only refreshes it. Per account like everything else here; with
  // nobody signed in there is no account to keep it for, so writes are dropped.
  readCache(name) {
    return StorageService.getItem(this.scopedKey(`cache_${name}`));
  }

  writeCache(name, value) {
    if (!this.getUserProfile()?.username) {
      return;
    }
    StorageService.setItem(this.scopedKey(`cache_${name}`), value);
  }

  // Clear all storage
  clearAll() {
    getStore().clearAll();
  }
}

export default new EnhancedStorage();