import { getStore } from './secureStorage';

// JSON over the encrypted MMKV store. Everything the app keeps on the device
// lives here; tokens are the exception (see secureStorage).
class StorageService {
  setItem(key, value) {
    try {
      getStore().set(key, JSON.stringify(value));
    } catch (error) {
      console.error(`MMKV setItem error {${key}}, :{${value}}`, error);
    }
  }

  getItem(key) {
    try {
      const value = getStore().getString(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('MMKV getItem error:', error);
      return null;
    }
  }

  removeItem(key) {
    try {
      getStore().delete(key);
    } catch (error) {
      console.error('MMKV removeItem error:', error);
    }
  }
}

export default new StorageService();
