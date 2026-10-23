// Members to report or block (specs/report-block R2.1, R2.4, R5.6).
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockMenu = jest.fn();
jest.mock('../../../hooks/useSafetyActions', () => ({ __esModule: true, default: () => ({ memberMenu: mockMenu }) }));

import MemberList from '../MemberList';

const members = [
  { id: 'u-me', userId: 'u-me', name: 'me', initials: 'ME', isSelf: true, isCreator: true },
  { id: 'u-ada', userId: 'u-ada', name: 'ada', initials: 'AD', isSelf: false, joinedAt: null },
  { id: 'u-bo', userId: 'u-bo', name: 'bo', initials: 'BO', isSelf: false, blocked: true },
  { id: 'dr', userId: '00000000-0000-0000-0000-000000000000', name: 'Deleted reader', initials: 'DR', isSelf: false },
];

beforeEach(() => jest.clearAllMocks());

it('lets you tap anyone else, not yourself or the Deleted reader (R2.1, R2.4)', async () => {
  await render(<MemberList members={members} roomId="rm_1" />);
  expect(screen.getAllByRole('button')).toHaveLength(2);

  await fireEvent.press(screen.getByLabelText('ada, Member'));
  expect(mockMenu).toHaveBeenCalledWith({ userId: 'u-ada', username: 'ada', blocked: undefined }, { roomId: 'rm_1' });
});

it('keeps a blocked member listed, marked (R5.6)', async () => {
  await render(<MemberList members={members} roomId="rm_1" />);
  expect(screen.getByLabelText('bo, blocked, Member')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('bo, blocked, Member'));
  expect(mockMenu).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-bo', blocked: true }), { roomId: 'rm_1' });
});
