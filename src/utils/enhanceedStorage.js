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

  // Reading progress (Hybrid approach)
  saveReadingProgress(manuscriptId, progress, book = null) {
    // MMKV first, and on its own: this is what the Home hero and the Reading
    // tab actually read back, so it must not be able to fail because of the
    // SQLite layer below. It used to run second, behind an
    // updateReadingProgress() that StorageService has never implemented — so
    // every save threw before reaching here and no reading position was ever
    // persisted.
    //
    // Store current position in MMKV for quick access. `book` carries just
    // enough of the manuscript (title/cover/url) for Home's "Continue
    // reading" hero and the Reading tab to show the real book — including
    // its real cover image — after a cold start.
    StorageService.setItem(this.scopedKey(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION), {
      manuscriptId,
      progress,
      book: book
        ? {
          book_id: book.book_id,
          title: book.title,
          cover_image_url: book.cover_image_url || null,
          manuscript_url: book.manuscript_url || null,
          // The room the book is being read with, when it was chosen in one,
          // and its members — so the Reading tab's pace card can name real
          // people after a cold start instead of the demo fixture.
          room_name: book.room_name || null,
          room_members: book.room_members || null,
        }
        : null,
      timestamp: Date.now(),
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
    return StorageService.getItem(this.scopedKey(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION));
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