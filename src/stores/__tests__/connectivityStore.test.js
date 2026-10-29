// Online state from NetInfo (specs/offline-first R1.1).

import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import useConnectivityStore, { startConnectivity, isOnline, recheckConnectivity, resetRecheck } from '../connectivityStore';

let emit;
let appStateListener;
let configured;

beforeAll(() => {
  NetInfo.addEventListener.mockImplementation((listener) => {
    emit = listener;
    return jest.fn();
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
  startConnectivity();
  // Kept now: jest.config clears mock calls before each test.
  [configured] = NetInfo.configure.mock.calls[0];
});

beforeEach(() => resetRecheck());

const wifi = { type: 'wifi', isConnected: true, isInternetReachable: true, details: { isConnectionExpensive: false } };

test('is online before NetInfo has answered', () => {
  expect(isOnline()).toBe(true);
});

test('subscribes once however often it is started', () => {
  startConnectivity();
  // jest.config clears call counts after beforeAll, so any call here is a second one.
  expect(NetInfo.addEventListener).not.toHaveBeenCalled();
});

test('follows connection changes', () => {
  emit(wifi);
  expect(useConnectivityStore.getState()).toEqual({ online: true, wifi: true, expensive: false });

  emit({ type: 'none', isConnected: false, isInternetReachable: false, details: null });
  expect(isOnline()).toBe(false);
  expect(useConnectivityStore.getState().wifi).toBe(false);

  emit({ type: 'cellular', isConnected: true, isInternetReachable: true, details: { isConnectionExpensive: true } });
  expect(useConnectivityStore.getState()).toEqual({ online: true, wifi: false, expensive: true });
});

// NetInfo's Google check is off (it stuck on offline after reconnects, and
// never passes where Google is blocked): a network that's up is online, and
// the API client's timeout handles one that goes nowhere.
test('turns NetInfo\'s reachability check off', () => {
  expect(configured.reachabilityShouldRun()).toBe(false);
});

test('a connected network counts as online whatever the reachability check says', () => {
  emit({ ...wifi, isInternetReachable: false });
  expect(isOnline()).toBe(true);
});

test('a missed reconnect is put right by a recheck', async () => {
  emit({ type: 'none', isConnected: false, isInternetReachable: false, details: null });
  NetInfo.refresh.mockResolvedValueOnce(wifi);
  recheckConnectivity();
  await Promise.resolve();
  await Promise.resolve();
  expect(isOnline()).toBe(true);
});

test('rechecks at most every few seconds', () => {
  recheckConnectivity();
  recheckConnectivity();
  expect(NetInfo.refresh).toHaveBeenCalledTimes(1);
});

test('rechecks on coming to the foreground', () => {
  appStateListener('active');
  expect(NetInfo.refresh).toHaveBeenCalledTimes(1);
});

// R1.6: back from a network that went nowhere, with nobody making requests.
test('while offline, pings the API every 10s until something answers', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn()
    .mockRejectedValueOnce(new TypeError('Network request failed'))
    .mockResolvedValueOnce({ status: 404 });

  useConnectivityStore.setState({ online: false });
  jest.advanceTimersByTime(10000);
  await Promise.resolve();
  await Promise.resolve();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toMatch(/\/ping$/);
  expect(isOnline()).toBe(false);

  jest.advanceTimersByTime(10000);
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
  // A 404 is still an answer.
  expect(isOnline()).toBe(true);

  // Online again: the pinging stops.
  jest.advanceTimersByTime(30000);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
