// Settings › Blocked readers (specs/report-block R6).
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  // Runs the effect once, as a first focus would.
  useFocusEffect: (fn) => require('react').useEffect(fn, [fn]),
}));
jest.mock('../../../components/PressableScale', () => {
  const { Pressable } = require('react-native');
  return { __esModule: true, default: (props) => <Pressable {...props} /> };
});
jest.mock('../../../utils/screenTracking', () => ({ useScreenTracking: () => {} }));
const mockUnblock = jest.fn();
jest.mock('../../../hooks/useSafetyActions', () => ({ __esModule: true, default: () => ({ unblockUser: mockUnblock }) }));
let mockState;
jest.mock('../../../stores/blocksStore', () => ({ __esModule: true, default: (pick) => pick(mockState) }));

import BlockedReadersScreen from '../BlockedReadersScreen';

beforeEach(() => {
  jest.clearAllMocks();
  mockUnblock.mockResolvedValue(true);
  mockState = { blocked: [], loaded: true, fetch: jest.fn().mockResolvedValue({ ok: true }) };
});

it('says nobody is blocked, and where Block is (R6.4)', async () => {
  await render(<BlockedReadersScreen />);
  expect(screen.getByText('You haven\'t blocked anyone.')).toBeTruthy();
  expect(screen.getByText('To block someone, tap ⋯ on their comment or their name in a room.')).toBeTruthy();
  expect(mockState.fetch).toHaveBeenCalled();
});

it('lists them with Unblock (R6.2, R6.3)', async () => {
  mockState.blocked = [{ userId: 'u-ada', username: 'ada' }, { userId: 'u-bo', username: 'bo' }];
  await render(<BlockedReadersScreen />);
  expect(screen.getByText('2 blocked')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Unblock ada'));
  expect(mockUnblock).toHaveBeenCalledWith({ userId: 'u-ada', username: 'ada' });
});

it('offers to try again when the list can\'t load', async () => {
  mockState = { blocked: [], loaded: false, fetch: jest.fn().mockResolvedValue({ ok: false }) };
  await render(<BlockedReadersScreen />);
  expect(await screen.findByText('Couldn\'t load blocked readers.')).toBeTruthy();
});
