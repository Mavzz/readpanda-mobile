// The open-room preview and its Join button (specs/open-rooms R5), with the
// store's join replaced so each answer the API can give is one line.
import { render, screen, fireEvent, act } from '@testing-library/react-native';

jest.mock('@env', () => ({}), { virtual: true });
// It animates with Reanimated, which has no native side under Jest. A plain
// View keeps onPress on the element, so a test can start a press without
// waiting for its handler.
jest.mock('../PressableScale', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props) => <View accessible {...props} /> };
});
jest.mock('../Toaster', () => ({ showToast: jest.fn() }));
jest.mock('../../utils/haptics', () => ({ __esModule: true, default: { success: jest.fn(), light: jest.fn() } }));
jest.mock('../../stores/roomStore', () => {
  const state = { joinOpenRoom: jest.fn() };
  const useRoomStore = (selector) => selector(state);
  useRoomStore.getState = () => state;
  return { __esModule: true, default: useRoomStore };
});

import { showToast } from '../Toaster';
import useRoomStore from '../../stores/roomStore';
import OpenRoomSheet from '../OpenRoomSheet';

const joinOpenRoom = useRoomStore.getState().joinOpenRoom;

const room = {
  id: 'rm_1',
  name: 'Midnight Club',
  description: 'Slow reads, late nights.',
  currentBookTitle: 'Middlemarch',
  coverUrl: null,
  memberCount: 3,
  creatorName: 'ada',
};

const renderSheet = async () => {
  const onJoined = jest.fn();
  const onStale = jest.fn();
  await render(<OpenRoomSheet room={room} visible onClose={jest.fn()} onJoined={onJoined} onStale={onStale} />);
  return { onJoined, onStale };
};

const joinButton = () => screen.getByRole('button', { name: 'Join room' });

beforeEach(() => jest.clearAllMocks());

it('shows what the room is before joining (R5.1)', async () => {
  await renderSheet();
  expect(screen.getByText('Midnight Club')).toBeTruthy();
  expect(screen.getByText('Slow reads, late nights.')).toBeTruthy();
  // Once on the placeholder cover too.
  expect(screen.getAllByText('Middlemarch').length).toBeGreaterThan(0);
  expect(screen.getByText('3 members · Started by ada')).toBeTruthy();
});

it('hands the joined room back (R5.2)', async () => {
  joinOpenRoom.mockResolvedValue({ status: 200, response: { id: 'rm_1', name: 'Midnight Club' } });
  const { onJoined } = await renderSheet();

  await fireEvent.press(joinButton());

  expect(joinOpenRoom).toHaveBeenCalledWith('rm_1');
  expect(onJoined).toHaveBeenCalledWith({ id: 'rm_1', name: 'Midnight Club' });
});

it('opens the room for someone already in it (R5.7)', async () => {
  joinOpenRoom.mockResolvedValue({ status: 409, already: true });
  const { onJoined } = await renderSheet();

  await fireEvent.press(joinButton());

  expect(onJoined).toHaveBeenCalledWith({ id: 'rm_1', name: 'Midnight Club' });
  expect(showToast).not.toHaveBeenCalled();
});

it.each([
  [403, 'This room is invite-only now', 'R5.5'],
  [404, 'This room is gone', 'R5.6'],
])('says so and asks for a reload on %i (%s, %s)', async (status, error) => {
  joinOpenRoom.mockResolvedValue({ status, error });
  const { onJoined, onStale } = await renderSheet();

  await fireEvent.press(joinButton());

  expect(showToast).toHaveBeenCalledWith(error, 'error');
  expect(onStale).toHaveBeenCalled();
  // Closed before the toast, which would otherwise sit behind the sheet.
  expect(onStale.mock.invocationCallOrder[0]).toBeLessThan(showToast.mock.invocationCallOrder[0]);
  expect(onJoined).not.toHaveBeenCalled();
});

it('says other failures in the sheet, where they can be seen', async () => {
  joinOpenRoom.mockResolvedValue({ status: 500, error: 'Couldn\'t join that room. Try again.' });
  const { onJoined, onStale } = await renderSheet();

  await fireEvent.press(joinButton());

  expect(screen.getByText('Couldn\'t join that room. Try again.')).toBeOnTheScreen();
  expect(showToast).not.toHaveBeenCalled();
  expect(onStale).not.toHaveBeenCalled();
  expect(onJoined).not.toHaveBeenCalled();
});

it('is busy while joining and takes one tap (R5.8, R9.2)', async () => {
  let finish;
  joinOpenRoom.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const { onJoined } = await renderSheet();

  // Straight to the handler: fireEvent.press resolves only once the handler
  // does, and this join is held open on purpose.
  let first;
  let second;
  await act(async () => { first = joinButton().props.onPress(); });
  await act(async () => { second = joinButton().props.onPress(); });

  expect(joinOpenRoom).toHaveBeenCalledTimes(1);
  expect(joinButton()).toBeBusy();

  await act(async () => finish({ status: 200, response: { id: 'rm_1', name: 'Midnight Club' } }));
  await Promise.all([first, second]);
  expect(onJoined).toHaveBeenCalledTimes(1);
  expect(joinButton()).not.toBeBusy();
});
