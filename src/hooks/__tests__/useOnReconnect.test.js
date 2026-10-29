// Refetching when the connection comes back (specs/offline-first R5.6).
import { renderHook } from '@testing-library/react-native';

// Focused for the length of the test: the focus effect runs like an effect.
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return { useFocusEffect: (effect) => useEffect(effect, [effect]) };
});

import useConnectivityStore from '../../stores/connectivityStore';
import useOnReconnect from '../useOnReconnect';

beforeEach(() => useConnectivityStore.setState({ online: false, wifi: false }));

it('calls back when the connection returns, not on other changes', async () => {
  const callback = jest.fn();
  await renderHook(() => useOnReconnect(callback));
  useConnectivityStore.setState({ wifi: true });
  expect(callback).not.toHaveBeenCalled();
  useConnectivityStore.setState({ online: true });
  useConnectivityStore.setState({ online: true, wifi: false });
  expect(callback).toHaveBeenCalledTimes(1);
});

it('uses the latest callback without resubscribing', async () => {
  const first = jest.fn();
  const second = jest.fn();
  const view = await renderHook(({ cb }) => useOnReconnect(cb), { initialProps: { cb: first } });
  await view.rerender({ cb: second });
  useConnectivityStore.setState({ online: true });
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledTimes(1);
});

it('stops listening once the screen is gone', async () => {
  const callback = jest.fn();
  const view = await renderHook(() => useOnReconnect(callback));
  await view.unmount();
  useConnectivityStore.setState({ online: true });
  expect(callback).not.toHaveBeenCalled();
});
