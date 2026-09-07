import { Local_IP, API_VERSION, BACKEND_URL } from '@env';
import messaging from '@react-native-firebase/messaging';
import log from '../utils/logger';
import { saveNotification, NotificationType } from './notification';

const getBackendUrl = (path = '') => {
  try {
    // When BACKEND_URL is set (e.g. a Google Cloud Run service base URL) use
    // it in place of the Local_IP + port combination.  API_VERSION is always
    // appended so both code paths produce the same URL shape.
    // Example: BACKEND_URL=https://readpanda-backend-<SERVICE-ID>-uc.a.run.app
    if (BACKEND_URL) {
      return `${BACKEND_URL}${API_VERSION}${path}`;
    }
    const ip = Local_IP || 'localhost';
    const port = 3000;
    return `http://${ip}:${port}${API_VERSION}${path}`;
  } catch {
    log.warn('⚠️ Failed to build backend URL, falling back to localhost');
    return `http://localhost:3000${path}`;
  }
};

const SignUpType = {
  Email: 'Email',
  Google: 'Google',
  Facebook: 'Facebook',
  Other: 'Other',
};

const checkNotificationPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    log.info('Notification permission granted.');
    log.info('Authorization status:', authStatus);

    // Set up message handler
    messaging().onMessage(async remoteMessage => {
      if (remoteMessage.data?.type === NotificationType.NEW_BOOK) {
        await saveNotification({
          type: NotificationType.NEW_BOOK,
          title: 'New Book Added',
          message: remoteMessage.notification.body,
          bookId: remoteMessage.data.bookId,
        });
      }
    });
  }
  return enabled;
};

export { getBackendUrl, SignUpType, checkNotificationPermission };
