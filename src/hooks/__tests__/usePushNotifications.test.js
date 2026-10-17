// The bell's badge re-reads the unread count when the app comes back to the
// foreground (R6.8), and only while signed in.
import { AppState } from 'react-native';
import { renderHook } from '@testing-library/react-native';

jest.mock('@react-native-firebase/messaging', () => {
  // Permission denied, so the push setup itself stays out of the way.
  const messaging = () => ({ requestPermission: jest.fn(() => Promise.resolve(0)) });
  messaging.AuthorizationStatus = { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: messaging };
});
jest.mock('../../components/Toaster', () => ({ showToast: jest.fn() }));
jest.mock('../../utils/openNotification', () => ({ __esModule: true, default: jest.fn(), notificationFromPush: jest.fn() }));
jest.mock('../../stores/readingProgressStore', () => ({ __esModule: true, default: { getState: () => ({}) } }));
jest.mock('../../stores/commentsStore', () => ({ __esModule: true, default: { getState: () => ({}) } }));

import useNotificationStore from '../../stores/notificationStore';
import usePushNotifications from '../usePushNotifications';

let listeners;
let refreshUnreadCount;

beforeEach(() => {
  listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((event, fn) => {
    listeners.push(fn);
    return { remove: () => { listeners = listeners.filter((l) => l !== fn); } };
  });
  refreshUnreadCount = jest.fn();
  useNotificationStore.setState({ refreshUnreadCount });
});

afterEach(() => jest.restoreAllMocks());

const emit = (state) => listeners.forEach((fn) => fn(state));

it('refreshes the unread count when the app becomes active', async () => {
  await renderHook(() => usePushNotifications({ isAuthenticated: true, navigationRef: {} }));

  emit('background');
  expect(refreshUnreadCount).not.toHaveBeenCalled();
  emit('active');
  expect(refreshUnreadCount).toHaveBeenCalledTimes(1);
});

it('does nothing when signed out', async () => {
  await renderHook(() => usePushNotifications({ isAuthenticated: false, navigationRef: {} }));

  emit('active');
  expect(refreshUnreadCount).not.toHaveBeenCalled();
});

it('stops listening after signing out', async () => {
  const { rerender } = await renderHook(
    ({ signedIn }) => usePushNotifications({ isAuthenticated: signedIn, navigationRef: {} }),
    { initialProps: { signedIn: true } },
  );
  await rerender({ signedIn: false });

  emit('active');
  expect(refreshUnreadCount).not.toHaveBeenCalled();
});
