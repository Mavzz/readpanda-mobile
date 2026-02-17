import { storage } from './storage';
import log from './logger';

const NOTIFICATION_STORAGE_KEY = 'notifications';

export const NotificationType = {
  NEW_BOOK: 'NEW_BOOK',
  SYSTEM: 'SYSTEM',
};

export const saveNotification = async (notification) => {
  try {
    const userStorage = storage('user_storage');
    const existingNotifications = userStorage.getString(NOTIFICATION_STORAGE_KEY);
    const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
    
    notifications.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    });

    userStorage.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    return notifications.length;
  } catch (error) {
    log.error('Error saving notification:', error);
    return 0;
  }
};

export const getNotifications = () => {
  try {
    const userStorage = storage('user_storage');
    const notifications = userStorage.getString(NOTIFICATION_STORAGE_KEY);
    return notifications ? JSON.parse(notifications) : [];
  } catch (error) {
    log.error('Error getting notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const userStorage = storage('user_storage');
    const notifications = getNotifications();
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification,
    );
    
    userStorage.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(updatedNotifications));
    return updatedNotifications.filter(n => !n.read).length;
  } catch (error) {
    log.error('Error marking notification as read:', error);
    return 0;
  }
};

export const getUnreadCount = () => {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
};