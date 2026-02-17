import { putRequest } from './usePut';
import { getRequest } from './useGet';
import { getBackendUrl } from '../utils/Helper';
import log from '../utils/logger';

export const NotificationService = {
  async getNotifications() {
    try {
      const backendUrl = await getBackendUrl('/notifications');
      const response = await getRequest(backendUrl);
      return response.data;
    } catch (error) {
      log.error('Error fetching notifications:', error);
      return [];
    }
  },

  async markAsRead(notificationId) {
    try {
      const backendUrl = await getBackendUrl(`/notifications/${notificationId}/read`);
      await putRequest(backendUrl);
      return true;
    } catch (error) {
      log.error('Error marking notification as read:', error);
      return false;
    }
  },

  async getUnreadCount() {
    try {
      const backendUrl = await getBackendUrl('/notifications/unread/count');
      const response = await getRequest(backendUrl);
      return response.data.count;
    } catch (error) {
      log.error('Error fetching unread count:', error);
      return 0;
    }
  },
};