import { create } from 'zustand';
import log from '../utils/logger';
import { NotificationService } from '../services/notificationService';

const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const fetchedNotifications = await NotificationService.getNotifications();
      const unreadCount = (fetchedNotifications || []).filter((n) => !n.read).length;
      set({ notifications: fetchedNotifications || [], unreadCount });
    } catch (error) {
      log.error('Error fetching notifications:', error);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId) => {
    try {
      const success = await NotificationService.markAsRead(notificationId);
      if (success) {
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n,
          );
          return {
            notifications: updated,
            unreadCount: updated.filter((n) => !n.read).length,
          };
        });
      }
    } catch (error) {
      log.error('Error marking notification as read:', error);
    }
  },

  refreshUnreadCount: async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      log.error('Error fetching unread count:', error);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));

export default useNotificationStore;
