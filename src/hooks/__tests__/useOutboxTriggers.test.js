// When the outbox sends (specs/offline-first R3.3).
import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

jest.mock('../../stores/outboxStore', () => {
  const state = { flush: jest.fn(), catchUp: jest.fn() };
  return { __esModule: true, default: { getState: () => state } };
});

import useConnectivityStore from '../../stores/connectivityStore';
import useOutboxStore from '../../stores/outboxStore';
import useOutboxTriggers from '../useOutboxTriggers';

let appStateListener;
beforeEach(() => {
  useConnectivityStore.setState({ online: false });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
});

it('catches up when the connection comes back, and only then', async () => {
  await renderHook(() => useOutboxTriggers({ isAuthenticated: true }));
  useConnectivityStore.setState({ online: true });
  useConnectivityStore.setState({ wifi: true });
  expect(useOutboxStore.getState().catchUp).toHaveBeenCalledTimes(1);
});

it('flushes when the app comes to the foreground', async () => {
  await renderHook(() => useOutboxTriggers({ isAuthenticated: true }));
  appStateListener('background');
  appStateListener('active');
  expect(useOutboxStore.getState().flush).toHaveBeenCalledTimes(1);
});

it('does nothing while signed out', async () => {
  await renderHook(() => useOutboxTriggers({ isAuthenticated: false }));
  useConnectivityStore.setState({ online: true });
  expect(useOutboxStore.getState().catchUp).not.toHaveBeenCalled();
  expect(AppState.addEventListener).not.toHaveBeenCalled();
});
