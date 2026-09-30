import { useEffect } from 'react';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { showToast } from '../components/Toaster';
import useNotificationStore from '../stores/notificationStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import { NotificationService } from '../services/notificationService';
import findReaderBook from '../utils/readerBook';
import log from '../utils/logger';

const isEnabled = (status) =>
  status === messaging.AuthorizationStatus.AUTHORIZED ||
  status === messaging.AuthorizationStatus.PROVISIONAL;

// The server fills data with { type, notification_id, book_id? } — see
// api-go internal/notify. A tapped NEW_BOOK push opens that book; anything
// else opens nothing and just brings the inbox up to date.
const handleOpened = async (remoteMessage, navigationRef) => {
  const { fetchNotifications, markAsRead } = useNotificationStore.getState();
  const data = remoteMessage?.data || {};
  const notificationId = Number(data.notification_id);

  await fetchNotifications();
  if (notificationId) {
    markAsRead(notificationId);
  }

  if (data.type === 'NEW_BOOK' && data.book_id) {
    const book = await findReaderBook(data.book_id);
    if (!book) {
      return;
    }
    // ManuscriptScreen lives in the authenticated "Main" navigator, so the
    // root ref has to address it through that. A tap that cold-started the
    // app can get here before the navigator has mounted — give it a moment.
    const open = () => navigationRef.current?.navigate('Main', { screen: 'ManuscriptScreen', params: { book } });
    if (navigationRef.isReady?.()) {
      open();
    } else {
      setTimeout(open, 500);
    }
  }
};

// Push is a nudge to look at the inbox, not a second copy of it: the server
// writes the inbox row and then pushes, so every message here just refreshes
// notificationStore from GET /notifications.
//
// Runs once signed in — asking for permission on the login screen is asking
// before the reader knows what they'd be notified about.
const usePushNotifications = ({ isAuthenticated, navigationRef }) => {
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const unsubscribers = [];
    let cancelled = false;

    const setUp = async () => {
      try {
        const status = await messaging().requestPermission();
        if (cancelled || !isEnabled(status)) {
          log.info('Push permission not granted:', status);
          return;
        }

        // Tell the server where to send this reader's pushes — and again
        // whenever FCM rotates the token.
        const token = await messaging().getToken();
        if (token && !cancelled) {
          NotificationService.registerDevice(token, Platform.OS);
        }
        unsubscribers.push(messaging().onTokenRefresh((next) => {
          NotificationService.registerDevice(next, Platform.OS);
        }));

        // Foreground: iOS doesn't show a banner, so say so ourselves.
        unsubscribers.push(messaging().onMessage(async (remoteMessage) => {
          const body = remoteMessage.notification?.body;
          if (body) {
            showToast(body, 'info');
          }
          useNotificationStore.getState().refreshUnreadCount();
          // A friend's comment on the book being read changes what the
          // home-screen widget says; reloading the comments is what
          // re-syncs it (src/widget/useWidgetSync.js).
          const hero = useReadingProgressStore.getState().activeBook;
          if (hero?.roomId) {
            useCommentsStore.getState().loadComments(hero.roomId, hero.id);
          }
        }));

        // Tapped from the background, or the tap that launched the app.
        unsubscribers.push(messaging().onNotificationOpenedApp(
          (remoteMessage) => handleOpened(remoteMessage, navigationRef),
        ));
        const initial = await messaging().getInitialNotification();
        if (initial && !cancelled) {
          handleOpened(initial, navigationRef);
        }
      } catch (error) {
        // Android has no google-services.json yet, so there is no default
        // Firebase app to talk to — push is simply off there.
        log.warn('Push notifications unavailable:', error?.message);
      }
    };

    setUp();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [isAuthenticated, navigationRef]);
};

// Sign-out: stop this device receiving the reader's pushes. Must run while the
// access token is still stored. Best-effort — the server also moves a token
// to whoever registers it next.
export const unregisterPushDevice = async () => {
  try {
    const token = await messaging().getToken();
    if (token) {
      await NotificationService.unregisterDevice(token);
    }
  } catch (error) {
    log.warn('Could not unregister push device:', error?.message);
  }
};

export default usePushNotifications;
