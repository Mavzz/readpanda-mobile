import StorageService, { mmkvStorage } from '../services/storageService';
import { STORAGE_CATEGORIES } from '../constants/storageConstants';

class EnhancedStorage {
  // Auth related storage (MMKV)
  async storeAuthData(authData) {
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN, authData.token);
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE, authData.user);
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.REFRESH_TOKEN, authData.refreshToken);
  }

  async getAuthToken() {
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN);
  }

  async clearAuthData() {
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.AUTH_TOKEN);
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.USER_PROFILE);
    StorageService.removeItem(STORAGE_CATEGORIES.MMKV.REFRESH_TOKEN);
  }

  // App preferences (MMKV)
  async storeUserPreference(key, value) {
    StorageService.setItem(`pref_${key}`, value);
  }

  async getUserPreference(key, defaultValue = null) {
    return StorageService.getItem(`pref_${key}`) || defaultValue;
  }

  // Manuscript operations (SQLite)
  async saveManuscript(manuscript) {
    return await StorageService.saveManuscript(manuscript);
  }

  async getManuscripts(filters) {
    return await StorageService.getManuscripts(filters);
  }

  async getFavoriteManuscripts() {
    return await StorageService.getManuscripts({ isFavorite: true });
  }

  // Reading progress (Hybrid approach)
  async saveReadingProgress(manuscriptId, progress) {
    // Store in SQLite for persistence
    await StorageService.updateReadingProgress(manuscriptId, progress);
    
    // Store current position in MMKV for quick access
    StorageService.setItem(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION, {
      manuscriptId,
      progress,
      timestamp: Date.now()
    });
  }

  async getCurrentReadingPosition() {
    return StorageService.getItem(STORAGE_CATEGORIES.MMKV.LAST_READ_POSITION);
  }

  // Cache management (MMKV)
  async cacheApiResponse(key, data, ttl = 5 * 60 * 1000) { // 5 minutes default
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    };
    StorageService.setItem(`cache_${key}`, cacheData);
  }

  async getCachedData(key) {
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
  async clearAll() {
    // Clear MMKV
    mmkvStorage.clearAll();
    
    // Clear SQLite (optional - usually you'd want to keep some data)
    // await StorageService.db.executeSql('DELETE FROM manuscripts');
    // await StorageService.db.executeSql('DELETE FROM reading_rooms');
  }
}

export default new EnhancedStorage();