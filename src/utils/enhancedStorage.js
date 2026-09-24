import StorageService, { mmkvStorage } from '../services/storageService';
import { STORAGE_CATEGORIES } from '../constants/storageConstants';
import log from './logger';

class EnhancedStorage {
  // Auth related storage (MMKV)
  storeAuthData(authData) {
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN, authData.token);
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE, authData.userDetails);
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.REFRESH_TOKEN, authData.refreshToken);
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
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN);
  }

  getUserProfile() {
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE);
  }

  getRefreshToken() {
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.REFRESH_TOKEN);
  }

  updateAuthToken(newToken) {
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN, newToken);
  }

  updateRefreshToken(newRefreshToken) {
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.REFRESH_TOKEN, newRefreshToken);
  }

  updateUserProfile(updates) {
    const currentProfile = this.getUserProfile();
    if (!currentProfile) return;

    const updatedProfile = { ...currentProfile, ...updates };
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE, updatedProfile);
  }

  clearAuthData() {
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN);
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE);
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.REFRESH_TOKEN);
  }

  // Everything below the auth keys belongs to ONE account. Two people signing
  // into the same device must not share a reading position or a cached
  // recommendation, so those keys carry the username. The auth keys
  // themselves stay global — they're what identifies the current account.
  scopedKey(key) {
    const username = this.getUserProfile()?.username;
    return username ? `${key}::${username}` : key;
  }

  // App preferences (MMKV)
  storeUserPreference(key, value) {
    StorageService.setItem(this.scopedKey(`pref_${key}`), value);
  }

  getUserPreference(key, defaultValue = null) {
    return StorageService.getItem(this.scopedKey(`pref_${key}`)) || defaultValue;
  }

  // Manuscript operations (SQLite)
  saveManuscript(manuscript) {
    return StorageService.saveManuscript(manuscript);
  }

  getManuscripts(filters) {
    return StorageService.getManuscripts(filters);
  }

  getFavoriteManuscripts() {
    return StorageService.getManuscripts({ isFavorite: true });
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

  // Reading progress (Hybrid approach)
  saveReadingProgress(manuscriptId, progress, book = null) {
    // MMKV first, and on its own: this is what the Home hero and the Reading
    // tab actually read back, so it must not be able to fail because of the
    // SQLite layer below. It used to run second, behind an
    // updateReadingProgress() that StorageService has never implemented — so
    // every save threw before reaching here and no reading position was ever
    // persisted.
    //
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

    // SQLite is the durable per-user history: reading_progress is keyed
    // UNIQUE(username, book_id), and the write also queues the row for upload
    // once a progress endpoint exists. This used to call a non-existent
    // `updateReadingProgress(manuscriptId, progress)`; the real method is
    // saveReadingProgress(username, bookId, currentPage, totalPages).
    //
    // It's async and best-effort — the MMKV position above is already saved,
    // and a SQLite failure must not surface as a lost reading position.
    const username = this.getUserProfile()?.username;
    if (username) {
      Promise.resolve(
        StorageService.saveReadingProgress(
          username,
          manuscriptId,
          progress?.currentPage || 0,
          progress?.totalPages || 0,
        ),
      ).catch((error) => {
        log.error('SQLite reading-progress write failed (MMKV position is saved):', error);
      });
    }
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

  // Cache management (MMKV)
  cacheApiResponse(key, data, ttl = 5 * 60 * 1000) { // 5 minutes default
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    StorageService.setItem(`cache_${key}`, cacheData);
  }

  getCachedData(key) {
    const cached = StorageService.getItem(`cache_${key}`);
    if (!cached) return null;

    const { data, timestamp, ttl } = cached;
    if (Date.now() - timestamp > ttl) {
      StorageService.removeItem(`cache_${key}`);
      return null;
    }

    return data;
  }

  // Clear all storage
  clearAll() {
    // Clear MMKV
    mmkvStorage.clearAll();

    // Clear SQLite (optional - usually you'd want to keep some data)
    //  StorageService.db.executeSql('DELETE FROM manuscripts');
    //  StorageService.db.executeSql('DELETE FROM reading_rooms');
  }
}

export default new EnhancedStorage();