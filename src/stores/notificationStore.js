import { create } from 'zustand';
import log from '../utils/logger';
import { NotificationService } from '../services/notificationService';

const useNotificationStore = create((set, get) => ({
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
    // Optimistic — the dot goes the moment it's tapped — and put back if the
    // server didn't take it, so the badge never claims a read it doesn't hold.
    const previous = get().notifications;
    const apply = (notifications) => set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
    apply(previous.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    try {
      const success = await NotificationService.markAsRead(notificationId);
      if (!success) {
        apply(get().notifications.map((n) => (
          n.id === notificationId ? { ...n, read: previous.find((p) => p.id === n.id)?.read ?? n.read } : n
        )));
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
