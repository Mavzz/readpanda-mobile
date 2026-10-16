import { create } from 'zustand';
import log from '../utils/logger';
import { NotificationService } from '../services/notificationService';

// The Notifications screen's switches, in the order it shows them.
export const NOTIFICATION_SETTINGS = ['replies', 'roomComments', 'roomJoins', 'roomBook', 'newBooks'];

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  // { replies, roomComments, roomJoins, roomBook, newBooks }, null until fetched.
  settings: null,

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

  fetchSettings: async () => {
    const settings = await NotificationService.getSettings();
    if (settings) {
      set({ settings });
    }
  },

  // Optimistic, like markAsRead: the switch moves at once and goes back if
  // the server didn't take it. Only that switch goes back, so a second one
  // flipped in the meantime keeps its new value. Resolves to whether it
  // saved, so the screen can say when it didn't.
  setSetting: async (key, on) => {
    const before = get().settings?.[key] ?? true;
    set((state) => ({ settings: { ...state.settings, [key]: on } }));
    const saved = await NotificationService.updateSettings({ [key]: on });
    if (saved) {
      set((state) => ({ settings: { ...state.settings, [key]: saved[key] } }));
      return true;
    }
    set((state) => ({ settings: { ...state.settings, [key]: before } }));
    return false;
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0, settings: null });
  },
}));

export default useNotificationStore;
