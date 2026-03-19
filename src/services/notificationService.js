import { makeAuthenticatedGetRequest, makeAuthenticatedPutRequest } from './authenticatedRequests';
import { getBackendUrl } from '../utils/Helper';
import log from '../utils/logger';

export const NotificationService = {
  async getNotifications() {
    try {
      const { response } = await makeAuthenticatedGetRequest(getBackendUrl('/notifications'));
      return response || [];
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

  async getUnreadCount() {
    try {
      const { response } = await makeAuthenticatedGetRequest(getBackendUrl('/notifications/unread/count'));
      return response?.count ?? 0;
    } catch (error) {
      log.error('Error fetching unread count:', error);
      return 0;
    }
  },
};