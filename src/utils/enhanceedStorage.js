import StorageService, { mmkvStorage } from '../services/storageService';
import { STORAGE_CATEGORIES } from '../constants/storageConstants';

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

  // App preferences (MMKV)
  storeUserPreference(key, value) {
    StorageService.setItem(`pref_${key}`, value);
  }

  getUserPreference(key, defaultValue = null) {
    return StorageService.getItem(`pref_${key}`) || defaultValue;
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
    // Store in SQLite for persistence
    StorageService.updateReadingProgress(manuscriptId, progress);

    // Store current position in MMKV for quick access. `book` carries just
    // enough of the manuscript (title/cover/url) for Home's "Continue
    // reading" hero and the Reading tab to show the real book — including
    // its real cover image — after a cold start.
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION, {
      manuscriptId,
      progress,
      book: book
        ? {
          book_id: book.book_id,
          title: book.title,
          cover_image_url: book.cover_image_url || null,
          manuscript_url: book.manuscript_url || null,
        }
        : null,
      timestamp: Date.now(),
    });
  }

  getCurrentReadingPosition() {
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION);
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