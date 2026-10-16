import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPutRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from './authenticatedRequests';
import { getBackendUrl } from '../utils/Helper';
import log from '../utils/logger';

// GET /notifications returns { id, type, title, message, book_id, room_id,
// count, is_read, created_at, updated_at }; NotificationList renders
// { title, message, timestamp, read, type, bookId, roomId, count }.
// A bundled room-comments row changes as comments fold into it, so its time
// is the latest update, not when it was first written.
const toNotification = (n) => ({
  id: n.id,
  type: n.type || 'SYSTEM',
  title: n.title || 'ReadPanda',
  message: n.message || '',
  timestamp: n.updated_at ?? n.created_at ?? n.timestamp ?? null,
  read: !!(n.is_read ?? n.read),
  bookId: n.book_id ?? n.bookId ?? null,
  roomId: n.room_id ?? n.roomId ?? null,
  count: n.count ?? 1,
});

// The app's names for the switches, and the server's.
const SETTING_FIELDS = {
  replies: 'replies',
  roomComments: 'room_comments',
  roomJoins: 'room_joins',
  roomBook: 'room_book',
  newBooks: 'new_books',
};

// Anything the server leaves out counts as on, which is its own default.
const toSettings = (raw) => Object.fromEntries(
  Object.entries(SETTING_FIELDS).map(([key, field]) => [key, raw?.[field] !== false]),
);

const toSettingsBody = (patch) => Object.fromEntries(
  Object.entries(patch)
    .filter(([key]) => SETTING_FIELDS[key])
    .map(([key, on]) => [SETTING_FIELDS[key], !!on]),
);

export const NotificationService = {
  async getNotifications() {
    try {
      const { response } = await makeAuthenticatedGetRequest(getBackendUrl('/notifications'));
      return (response || []).map(toNotification);
    } catch (error) {
      log.error('Error fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId) {
    try {
      await makeAuthenticatedPutRequest(getBackendUrl(`/notifications/${notificationId}/read`), {});
      return true;
    } catch (error) {
      log.error('Error marking notification as read:', error);
      return false;
    }
  },

  // POST /users/me/devices — where the server sends this user's pushes. The
  // server keys on the token, so re-registering after an account switch moves
  // the device rather than duplicating it.
  async registerDevice(token, platform) {
    try {
      await makeAuthenticatedPostRequest(getBackendUrl('/users/me/devices'), { token, platform });
      return true;
    } catch (error) {
      log.error('Error registering device for push:', error);
      return false;
    }
  },

  // DELETE /users/me/devices/{token} — on sign-out, so the next person on
  // this phone doesn't get the previous reader's pushes.
  async unregisterDevice(token) {
    try {
      await makeAuthenticatedDeleteRequest(
        getBackendUrl(`/users/me/devices/${encodeURIComponent(token)}`),
      );
      return true;
    } catch (error) {
      log.error('Error unregistering device:', error);
      return false;
    }
  },

  // GET /users/me/notification-settings — one switch per kind of
  // notification. Null when it couldn't be loaded.
  async getSettings() {
    try {
      const { response } = await makeAuthenticatedGetRequest(getBackendUrl('/users/me/notification-settings'));
      return toSettings(response);
    } catch (error) {
      log.error('Error fetching notification settings:', error);
      return null;
    }
  },

  // PUT /users/me/notification-settings with only the switches that changed.
  // Returns the full set as saved, or null if it wasn't.
  async updateSettings(patch) {
    try {
      const { response } = await makeAuthenticatedPutRequest(
        getBackendUrl('/users/me/notification-settings'),
        toSettingsBody(patch),
      );
      return toSettings(response);
    } catch (error) {
      log.error('Error saving notification settings:', error);
      return null;
    }
  },

  async getUnreadCount() {
    try {
      const { response } = await makeAuthenticatedGetRequest(getBackendUrl('/notifications/unread/count'));
      return response?.unread_count ?? 0;
    } catch (error) {
      log.error('Error fetching unread count:', error);
      return 0;
    }
  },
};
