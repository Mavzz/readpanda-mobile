import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPutRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from './authenticatedRequests';
import { getBackendUrl } from '../utils/Helper';
import log from '../utils/logger';

// GET /notifications returns { id, type, title, message, book_id, is_read, created_at };
// NotificationList renders { title, message, timestamp, read, type, bookId }.
const toNotification = (n) => ({
  id: n.id,
  type: n.type || 'SYSTEM',
  title: n.title || 'ReadPanda',
  message: n.message || '',
  timestamp: n.created_at ?? n.timestamp ?? null,
  read: !!(n.is_read ?? n.read),
  bookId: n.book_id ?? n.bookId ?? null,
});

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
