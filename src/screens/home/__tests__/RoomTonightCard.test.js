// Rooms tonight nudging you when roommates have started a book you haven't.
import { render, screen } from '@testing-library/react-native';

// It animates with Reanimated, which has no native side under Jest.
jest.mock('../../../components/PressableScale', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props) => <View accessible {...props} /> };
});

import RoomTonightCard, { startedLine } from '../RoomTonightCard';

const member = (name, progressPct, isMe = false) => ({ userId: name, name, initials: name.slice(0, 2).toUpperCase(), progressPct, isMe });

const notStarted = (members) => ({
  room: { id: 'rm_1', name: 'Mid club' },
  state: 'notStarted',
  schedule: null,
  bookTitle: 'Moby Dick',
  unread: 0,
  members,
  myPct: 0,
});

describe('startedLine', () => {
  it('names the one reader and how far in', () => {
    expect(startedLine([member('aditya n', 2.4)])).toBe('aditya n is 2% in');
  });

  it('leads with whoever is furthest in', () => {
    expect(startedLine([member('ada', 5), member('bo', 40), member('cy', 12)])).toBe('bo is 40% in · 2 more reading');
  });

  it('reads a barely started book as 1%', () => {
    expect(startedLine([member('ada', 0.3)])).toBe('ada is 1% in');
  });

  it('is empty with nobody started', () => {
    expect(startedLine([])).toBe('');
  });
});

it('shows the nudge on a room book you haven\'t started', async () => {
  await render(
    <RoomTonightCard item={notStarted([member('me', 0, true), member('aditya n', 2)])} onOpen={jest.fn()} onStart={jest.fn()} />,
  );
  expect(screen.getByText('aditya n is 2% in')).toBeTruthy();
  expect(screen.getByLabelText('Mid club, Moby Dick, aditya n is 2% in')).toBeTruthy();
});

it('says nothing when nobody else has started', async () => {
  await render(
    <RoomTonightCard item={notStarted([member('me', 0, true), member('ada', 0)])} onOpen={jest.fn()} onStart={jest.fn()} inList />,
  );
  expect(screen.queryByText(/% in/)).toBeNull();
});
