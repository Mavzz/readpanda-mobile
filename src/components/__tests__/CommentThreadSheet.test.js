// The JS thread sheet's ⋯ menu, placeholders and refused comments
// (specs/report-block R1.1, R7.1, R7.4, R8.3, R12.1, R12.3).
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../Toaster', () => ({ __esModule: true, default: () => null, showToast: jest.fn() }));
const mockMenu = jest.fn();
jest.mock('../../hooks/useSafetyActions', () => ({ __esModule: true, default: () => ({ commentMenu: mockMenu }) }));
const mockStore = { discardFailed: jest.fn() };
jest.mock('../../stores/commentsStore', () => ({ __esModule: true, default: (pick) => pick(mockStore) }));

import CommentThreadSheet from '../CommentThreadSheet';

const comment = (id, extra = {}) => ({
  id, clientId: `cmt_${id}`, userId: 'u-ada', username: 'ada', initials: 'AD', page: 2, body: `${id} text`,
  likes: 0, likedByMe: false, read: true, createdAt: Date.now(), replies: [], pending: false, failed: false,
  isMine: false, deleted: null, hidden: null, ...extra,
});

const renderSheet = (comments) =>
  render(
    <CommentThreadSheet
      visible
      thread={{ anchorKey: 'k', page: 2, anchorText: 'a passage', comments }}
      bookId="bk_1"
      roomId="rm_1"
      roomName="Club"
      submitting={false}
      onClose={jest.fn()}
    />,
  );

beforeEach(() => jest.clearAllMocks());

it('gives saved comments a ⋯ named for its author, and hands it the comment (R1.1, R12.1)', async () => {
  const ada = comment('c1');
  await renderSheet([ada]);
  await fireEvent.press(screen.getByLabelText('More actions for ada\'s comment'));
  expect(mockMenu).toHaveBeenCalledWith(ada, { bookId: 'bk_1', roomId: 'rm_1' });
});

it('has no ⋯ while sending, after a failure, or on the Deleted reader\'s', async () => {
  await renderSheet([
    comment('cmt_x', { clientId: 'cmt_x', pending: true, isMine: true, username: 'me' }),
    comment('c2', { failed: true, username: 'bo' }),
    comment('c3', { userId: '00000000-0000-0000-0000-000000000000', username: 'Deleted reader' }),
  ]);
  expect(screen.queryByLabelText(/More actions/)).toBeNull();
});

it('shows placeholders as what they are, with replies and no actions (R7.4, R12.3)', async () => {
  await renderSheet([
    comment('c1', { deleted: 'author', body: '', username: '', replies: [comment('r1', { username: 'bo' })] }),
    comment('c2', { deleted: 'moderator', body: '', replies: [comment('r2')] }),
    comment('c3', { hidden: 'reported', body: '', replies: [comment('r3')] }),
  ]);
  expect(screen.getByLabelText('Comment deleted')).toBeTruthy();
  expect(screen.getByLabelText('Removed by ReadPanda')).toBeTruthy();
  expect(screen.getByLabelText('You reported this comment')).toBeTruthy();
  expect(screen.getByText('r1 text')).toBeTruthy();
  // Three replies' menus, none for the placeholders; and they don't count.
  expect(screen.getAllByLabelText(/More actions/)).toHaveLength(3);
  expect(screen.getByText('3 comments · Page 3')).toBeTruthy();
});

it('offers Edit, not Retry, on a refused comment, and puts it back in the composer (R8.3)', async () => {
  const refused = comment('cmt_r', { clientId: 'cmt_r', isMine: true, username: 'me', failed: 'blocked_words', body: 'rude words' });
  await renderSheet([refused]);
  expect(screen.queryByText(/Retry/)).toBeNull();
  await fireEvent.press(screen.getByText('Includes words we don\'t allow · Edit'));
  expect(screen.getByLabelText('Comment').props.value).toBe('rude words');
  expect(mockStore.discardFailed).toHaveBeenCalledWith('bk_1', 'cmt_r');
});

it('keeps the last thread on screen while the sheet closes', async () => {
  const props = { bookId: 'bk_1', roomId: 'rm_1', roomName: 'Club', submitting: false, onClose: jest.fn() };
  const thread = { anchorKey: 'k', page: 2, anchorText: 'a passage', comments: [comment('c1')] };
  const { rerender } = await render(<CommentThreadSheet visible thread={thread} {...props} />);
  // Closing clears the thread; the Modal is still sliding away.
  await rerender(<CommentThreadSheet visible thread={null} {...props} />);
  expect(screen.getByText('c1 text')).toBeTruthy();
});
