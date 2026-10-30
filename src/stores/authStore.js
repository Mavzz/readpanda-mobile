import { create } from 'zustand';
import log from '../utils/logger';
import enhancedStorage from '../utils/enhancedStorage';
import { accountFrom } from '../utils/account';
import { fetchProfile } from '../services/auth';
import useReadingProgressStore, { hydrateMemberProgress } from './readingProgressStore';
import useCommentsStore, { hydrateComments } from './commentsStore';
import useRoomStore, { hydrateRooms } from './roomStore';
import useBucketsStore, { hydrateBuckets } from './bucketsStore';
import useBooksStore from './booksStore';
import useNotificationStore, { hydrateNotifications } from './notificationStore';
import useHighlightsStore, { hydrateHighlights } from './highlightsStore';
import useSubscriptionStore from './subscriptionStore';
import useBlocksStore from './blocksStore';
import useOutboxStore, { hydrateOutbox } from './outboxStore';

// What this account's Home and My Books showed last time, read back once
// storage knows whose it is.
const hydrateCaches = () => {
  hydrateRooms();
  hydrateBuckets();
  hydrateHighlights();
  hydrateComments();
  hydrateNotifications();
  hydrateMemberProgress();
  // After the stores it sends for, so their rows are there to update.
  hydrateOutbox();
  // Whatever was left from last time goes now, if it can (R3.3).
  useOutboxStore.getState().flush();
};

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
        hydrateCaches();
        // RevenueCat knows the account by its permanent id, so a username
        // change keeps ReadPanda+ (coming-soon R6). A session stored before
        // the app kept the id waits for the next token refresh (R6.2).
        if (authData.userProfile.userId) {
          useSubscriptionStore.getState().start(authData.userProfile.userId);
        }
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
      hydrateCaches();
      if (userData.userDetails?.userId) {
        useSubscriptionStore.getState().start(userData.userDetails.userId);
      }
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
      useHighlightsStore.getState().clearHighlights();
      useBlocksStore.getState().clear();
      useOutboxStore.getState().clearOutbox();
      useSubscriptionStore.getState().stop();
      log.info('User signed out');
    } catch (e) {
      log.error('Failed to clear user data', e);
    }
  },

  // A token refresh's account fields. A session stored before the app kept
  // them takes them here, and only then starts ReadPanda+ (coming-soon R6.2).
  adoptAccount: (account) => {
    const { user } = get();
    if (!user || !account?.userId || user.userId) {
      return;
    }
    get().updateUser(account);
    useSubscriptionStore.getState().start(account.userId);
  },

  // Catch up with the account as the server has it: a username, display name
  // or email changed on another device, or the id and sign-in kind a session
  // from before this build never stored (coming-soon R5.4, R6.2). A new
  // username moves this device's data to it first, as Edit profile's save
  // does, so books and positions follow. Offline it waits for the next time.
  syncAccount: async () => {
    if (!get().user) {
      return;
    }
    const { ok, profile } = await fetchProfile();
    const user = get().user;
    if (!ok || !profile || !user) {
      return;
    }
    const account = accountFrom(profile);
    get().adoptAccount(account);
    const username = profile.username || user.username;
    if (username !== user.username) {
      enhancedStorage.renameAccountData(user.username, username);
      log.info('Username changed on another device', { username });
    }
    get().updateUser({
      username,
      displayName: account.displayName,
      ...(account.loginType ? { loginType: account.loginType } : {}),
      ...(profile.email ? { email: profile.email } : {}),
    });
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
