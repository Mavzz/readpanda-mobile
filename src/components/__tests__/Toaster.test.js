// The offline toast isn't replaced by the error that follows it
// (specs/offline-first R1.5).

jest.mock('react-native-toast-message', () => ({ __esModule: true, default: { show: jest.fn() } }));

import Toast from 'react-native-toast-message';
import { showToast, showOfflineToast } from '../Toaster';

let now;
beforeEach(() => {
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());

test('drops error toasts while the offline toast is up, then lets them through', () => {
  showOfflineToast();
  expect(Toast.show).toHaveBeenCalledTimes(1);
  expect(Toast.show.mock.calls[0][0].text1).toMatch(/offline/i);

  showToast('Couldn\'t create the room', 'error');
  showOfflineToast(); // a second failed write in the same moment
  showToast('Saved', 'success');
  expect(Toast.show).toHaveBeenCalledTimes(2);
  expect(Toast.show.mock.calls[1][0].text1).toBe('Saved');

  now += 3000;
  showToast('Couldn\'t create the room', 'error');
  expect(Toast.show).toHaveBeenCalledTimes(3);
});

test('toasts sit above the Offline pill while it shows', () => {
  const useConnectivityStore = require('../../stores/connectivityStore').default;
  now += 10000;
  showToast('Saved', 'success');
  useConnectivityStore.setState({ online: false });
  showToast('Saved', 'success');
  useConnectivityStore.setState({ online: true });
  const offsets = Toast.show.mock.calls.map(([t]) => t.bottomOffset);
  expect(offsets).toEqual([100, 132]);
});
