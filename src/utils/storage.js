import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { SECRET_KEY } from '@env';
import log from './logger';

export const storeToken = async (token, username) => {
  try {
    const jsonValue = JSON.stringify(token);
    await AsyncStorage.setItem(`token_${username}`, jsonValue);
  } catch {
    throw new Error('Error saving data to AsyncStorage');
  }
};

export const storage = (storage_name)=> {
  const storage = new MMKV({
    id: storage_name, // Unique identifier for the storage
    encryptionKey: SECRET_KEY, // Optional: Use an encryption key for security
  });
  return storage;
};

export const updateNotificationCount = async (count) => {
  try {
    const userStorage = storage('user_storage');
    userStorage.setNumber('unreadNotifications', count);
  } catch (error) {
    log.error('Error updating notification count:', error);
  }
};

export const getNotificationCount = () => {
  try {
    const userStorage = storage('user_storage');
    return userStorage.getNumber('unreadNotifications') || 0;
  } catch (error) {
    log.error('Error getting notification count:', error);
    return 0;
  }
};