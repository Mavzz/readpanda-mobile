// The Offline pill and what VoiceOver hears (specs/offline-first R2.1, R2.4).
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

// Reanimated has no native side under Jest: the fade lands at once.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Easing: { out: () => () => 0, ease: () => 0, bezier: () => () => 0 },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (fn) => fn(),
    withTiming: (value) => value,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('react-native-screens', () => {
  const { View } = require('react-native');
  return { FullWindowOverlay: View };
});

import OfflinePill, { raiseOfflinePill, PILL_BOTTOM } from '../OfflinePill';
import useConnectivityStore from '../../stores/connectivityStore';
import useOutboxStore from '../../stores/outboxStore';

let announce;
beforeEach(() => {
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  useConnectivityStore.setState({ online: true });
  useOutboxStore.setState({ catchingUp: false });
});

const pillOpacity = () => {
  const style = [screen.getByTestId('offline-pill', { includeHiddenElements: true }).props.style].flat(Infinity);
  return Object.assign({}, ...style).opacity;
};

it('stays out of sight while online, and says nothing at launch', async () => {
  await render(<OfflinePill />);
  expect(pillOpacity()).toBe(0);
  expect(announce).not.toHaveBeenCalled();
});

it('shows while offline and announces each change', async () => {
  await render(<OfflinePill />);

  await act(async () => useConnectivityStore.setState({ online: false }));
  expect(pillOpacity()).toBe(1);
  expect(announce).toHaveBeenLastCalledWith('You\'re offline');

  await act(async () => useConnectivityStore.setState({ online: true }));
  expect(pillOpacity()).toBe(0);
  expect(announce).toHaveBeenLastCalledWith('Back online');
  expect(announce).toHaveBeenCalledTimes(2);
});

it('launching offline shows the pill without an announcement', async () => {
  useConnectivityStore.setState({ online: false });
  await render(<OfflinePill />);
  expect(pillOpacity()).toBe(1);
  expect(announce).not.toHaveBeenCalled();
});

it('reads Syncing… while catching up after reconnecting, then goes (R2.2, R2.3)', async () => {
  useConnectivityStore.setState({ online: false });
  await render(<OfflinePill />);
  expect(screen.getByText('Offline', { includeHiddenElements: true })).toBeTruthy();

  await act(async () => {
    useConnectivityStore.setState({ online: true });
    useOutboxStore.setState({ catchingUp: true });
  });
  expect(pillOpacity()).toBe(1);
  expect(screen.getByText('Syncing…', { includeHiddenElements: true })).toBeTruthy();

  await act(async () => useOutboxStore.setState({ catchingUp: false }));
  expect(pillOpacity()).toBe(0);
});

it('moves up under the reader\'s header while the comment sheet is open', async () => {
  useConnectivityStore.setState({ online: false });
  await render(<OfflinePill />);
  const anchor = () => screen.getByTestId('offline-pill-anchor', { includeHiddenElements: true });
  const place = () => Object.assign({}, ...[anchor().props.style].flat(Infinity));
  expect(place()).toMatchObject({ bottom: PILL_BOTTOM });

  await act(async () => raiseOfflinePill(true));
  expect(place()).toMatchObject({ top: 47 + 68 });
  expect(place().bottom).toBeUndefined();

  await act(async () => raiseOfflinePill(false));
  expect(place()).toMatchObject({ bottom: PILL_BOTTOM });
});
