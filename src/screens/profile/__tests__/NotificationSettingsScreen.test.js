// The Notifications screen against the real store, with the API, Firebase and
// navigation replaced.
import { Linking } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../services/authenticatedRequests', () => ({
  makeAuthenticatedGetRequest: jest.fn(),
  makeAuthenticatedPutRequest: jest.fn(),
  makeAuthenticatedPostRequest: jest.fn(),
  makeAuthenticatedDeleteRequest: jest.fn(),
}));
jest.mock('@react-native-firebase/messaging', () => {
  const hasPermission = jest.fn();
  const messaging = () => ({ hasPermission });
  messaging.AuthorizationStatus = { NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 };
  messaging.__hasPermission = hasPermission;
  return { __esModule: true, default: messaging };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  // Run the focus effect once on mount, as a focused screen would.
  useFocusEffect: (effect) => {
    require('react').useEffect(effect, []);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('../../../components/Toaster', () => ({ showToast: jest.fn() }));
jest.mock('../../../utils/openNotification', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../utils/screenTracking', () => ({ useScreenTracking: () => {} }));
// It animates with Reanimated, which has no native side under Jest.
jest.mock('../../../components/PressableScale', () => {
  const { Pressable } = require('react-native');
  return { __esModule: true, default: Pressable };
});

import messaging from '@react-native-firebase/messaging';
import { makeAuthenticatedGetRequest, makeAuthenticatedPutRequest } from '../../../services/authenticatedRequests';
import { showToast } from '../../../components/Toaster';
import useNotificationStore, { summarizeSettings } from '../../../stores/notificationStore';
import NotificationSettingsScreen from '../NotificationSettingsScreen';

const allOn = { replies: true, room_comments: true, room_joins: true, room_book: true, new_books: true };
const labels = ['Replies to you', 'Room comments', 'New members', 'Room picks a book', 'New books'];

const initial = useNotificationStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState(initial, true);
  makeAuthenticatedGetRequest.mockResolvedValue({ response: allOn });
  messaging.__hasPermission.mockResolvedValue(messaging.AuthorizationStatus.AUTHORIZED);
});

// The switch inside the row for label.
const switchFor = (label) => screen.getByRole('switch', { name: label });

it('shows a switch for each kind, all on by default', async () => {
  await render(<NotificationSettingsScreen />);

  for (const label of labels) {
    await waitFor(() => expect(switchFor(label).props.accessibilityState.checked).toBe(true));
  }
  expect(screen.queryByText(/off for ReadPanda in iOS Settings/)).toBeNull();
});

it('saves a change and keeps it', async () => {
  makeAuthenticatedPutRequest.mockResolvedValue({ response: { ...allOn, room_comments: false } });
  await render(<NotificationSettingsScreen />);
  await waitFor(() => switchFor('Room comments'));

  fireEvent.press(switchFor('Room comments'));

  await waitFor(() => expect(switchFor('Room comments').props.accessibilityState.checked).toBe(false));
  expect(makeAuthenticatedPutRequest.mock.calls[0][1]).toEqual({ room_comments: false });
  expect(showToast).not.toHaveBeenCalled();
});

it('puts the switch back and says so when saving fails', async () => {
  makeAuthenticatedPutRequest.mockRejectedValue(new Error('offline'));
  await render(<NotificationSettingsScreen />);
  await waitFor(() => switchFor('New books'));

  fireEvent.press(switchFor('New books'));

  await waitFor(() => expect(showToast).toHaveBeenCalledWith('Couldn\'t save. Try again.', 'error'));
  expect(switchFor('New books').props.accessibilityState.checked).toBe(true);
});

it('says when iOS has notifications off, and links to Settings', async () => {
  messaging.__hasPermission.mockResolvedValue(messaging.AuthorizationStatus.DENIED);
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await render(<NotificationSettingsScreen />);

  await waitFor(() => screen.getByText('Notifications are off for ReadPanda in iOS Settings'));
  fireEvent.press(screen.getByText('Open Settings'));

  expect(openSettings).toHaveBeenCalled();
  // The switches stay usable.
  expect(switchFor('Replies to you').props.accessibilityState.disabled).toBeFalsy();
});

describe('summarizeSettings (the Settings row value)', () => {
  const on = { replies: true, roomComments: true, roomJoins: true, roomBook: true, newBooks: true };

  it.each([
    [on, true, 'All on'],
    [{ ...on, roomComments: false, newBooks: false }, true, '3 of 5 on'],
    [{ replies: false, roomComments: false, roomJoins: false, roomBook: false, newBooks: false }, true, 'All off'],
    [on, false, 'Off in iOS Settings'],
    [null, null, null],
    [on, null, 'All on'], // permission not known yet
  ])('%j, permitted %p → %p', (settings, permitted, want) => {
    expect(summarizeSettings(settings, permitted)).toBe(want);
  });
});
