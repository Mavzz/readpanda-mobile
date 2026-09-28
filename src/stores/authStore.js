import { create } from 'zustand';
import log from '../utils/logger';
import enhancedStorage from '../utils/enhancedStorage';
import useReadingProgressStore from './readingProgressStore';
import useCommentsStore from './commentsStore';
import useRoomStore from './roomStore';
import useBucketsStore from './bucketsStore';
import useBooksStore from './booksStore';
import useNotificationStore from './notificationStore';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,

  loadUser: async () => {
    try {
      const authData = enhancedStorage.getAuthData();

      if (authData && authData.token && authData.userProfile) {
        set({
          user: authData.userProfile,
          token: authData.token,
          refreshToken: authData.refreshToken,
          isAuthenticated: true,
        });
        log.info('User data loaded from storage', { username: authData.userProfile.username });
      } else {
        log.info('No user data found in storage');
      }
    } catch (e) {
      log.error('Failed to load token from storage', e);
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (userData) => {
    try {
      set({
        user: userData.userDetails,
        token: userData.token,
        refreshToken: userData.refreshToken,
        isAuthenticated: true,
      });
      enhancedStorage.storeAuthData(userData);
    } catch (e) {
      log.error('Failed to save user data', e);
    }
  },

  signOut: async () => {
    try {
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      enhancedStorage.clearAuthData();
      // Stored state is keyed per account, but the in-memory stores aren't —
      // without this the next person to sign in on this device inherits the
      // previous reader's hero, rooms, buckets and inbox until something
      // reloads them.
      useReadingProgressStore.getState().clearProgress();
      useCommentsStore.getState().clearComments();
      useRoomStore.getState().clearRooms();
      useBucketsStore.getState().clearBuckets();
      useBooksStore.getState().clearBooks();
      useNotificationStore.getState().clearNotifications();
      log.info('User signed out');
    } catch (e) {
      log.error('Failed to clear user data', e);
    }
  },

  updateUser: async (updates) => {
    const { user } = get();
    if (!user) return;

    const updatedUser = { ...user, ...updates };
    log.info('Updating user data', { updatedUser });
    try {
      enhancedStorage.updateUserProfile(updates);
      set({ user: updatedUser });
      log.info('User data updated', { username: updatedUser.username });
    } catch (e) {
      log.error('Failed to update user data', e);
    }
  },
}));

export default useAuthStore;
