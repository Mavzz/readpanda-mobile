import { create } from 'zustand';
import log from '../utils/logger';
import { NotificationService } from '../services/notificationService';
import useOutboxStore, { registerOutboxHandlers } from './outboxStore';
import persistSlice from './persistSlice';

// The Notifications screen's switches, in the order it shows them.
export const NOTIFICATION_SETTINGS = ['replies', 'roomComments', 'roomJoins', 'roomBook', 'newBooks'];

// The Settings row's value (R7.6). `permitted` is iOS's answer (null while
// unknown); with notifications off there, the switches don't matter.
export const summarizeSettings = (settings, permitted) => {
  if (permitted === false) {
    return 'Off in iOS Settings';
  }
  if (!settings) {
    return null;
  }
  const on = NOTIFICATION_SETTINGS.filter((key) => settings[key]).length;
  if (on === NOTIFICATION_SETTINGS.length) {
    return 'All on';
  }
  return on === 0 ? 'All off' : `${on} of ${NOTIFICATION_SETTINGS.length} on`;
};

const withRead = (state, notificationId, read) => {
  const notifications = state.notifications.map((n) => (n.id === notificationId ? { ...n, read } : n));
  return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
};

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  // { replies, roomComments, roomJoins, roomBook, newBooks }, null until fetched.
  settings: null,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const fetched = await NotificationService.getNotifications();
      // Couldn't be fetched: keep the list from last time (R5.3, R5.4).
      if (!fetched) {
        return;
      }
      // Read here but not yet on the server: still read (R3.10).
      const reading = new Set(useOutboxStore.getState().items
        .filter((i) => i.kind === 'notification.read')
        .map((i) => i.ref));
      const notifications = fetched.map((n) => (reading.has(n.id) ? { ...n, read: true } : n));
      set({ notifications, unreadCount: notifications.filter((n) => !n.read).length });
    } catch (error) {
      log.error('Error fetching notifications:', error);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId) => {
    // Optimistic — the dot goes the moment it's tapped — and put back if the
    // server refuses it, so the badge never claims a read it doesn't hold.
    // Through the outbox, so offline it's kept and sent later (R3.1).
    const target = get().notifications.find((n) => n.id === notificationId);
    if (!target || target.read) {
      return;
    }
    set((state) => withRead(state, notificationId, true));
    const outbox = useOutboxStore.getState();
    outbox.enqueue({ kind: 'notification.read', ref: notificationId });
    await outbox.flush();
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

registerOutboxHandlers('notification.read', {
  send: (item) => NotificationService.markAsRead(item.ref, { quiet: true }),
  // Refused (not this reader's, 404): the dot comes back (R3.6).
  onRejected: (item) => useNotificationStore.setState((state) => withRead(state, item.ref, false)),
});

// The inbox from last time, offline too (R5.3).
export const hydrateNotifications = persistSlice(useNotificationStore, 'notifications', {
  pick: (s) => ({ notifications: s.notifications, unreadCount: s.unreadCount }),
});

export default useNotificationStore;
