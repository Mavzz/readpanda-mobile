// Report, block and delete (specs/report-block), with the system sheets and
// alerts answered by the test: each one picks the button named next.
import { renderHook, act } from '@testing-library/react-native';
// Jest runs as iOS, so the test answers iOS's own action sheet.
// eslint-disable-next-line react-native/split-platform-components
import { ActionSheetIOS, Alert } from 'react-native';

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('../../components/Toaster', () => ({ showToast: jest.fn() }));
// Android's sheets; Jest runs as iOS, where the system ones are used.
jest.mock('../../components/SafetySheetHost', () => ({ pickOption: jest.fn(), askText: jest.fn() }));
jest.mock('../../services/safetyService', () => ({ reportContent: jest.fn() }));
const mockComments = { hideReported: jest.fn(), deleteComment: jest.fn() };
const mockBlocks = { block: jest.fn(), unblock: jest.fn() };
jest.mock('../../stores/commentsStore', () => ({ __esModule: true, default: (pick) => pick(mockComments) }));
jest.mock('../../stores/blocksStore', () => ({ __esModule: true, default: (pick) => pick(mockBlocks) }));

import { showToast } from '../../components/Toaster';
import { reportContent } from '../../services/safetyService';
import useSafetyActions, { REPORT_REASONS } from '../useSafetyActions';

// The answers, in order: a reason label for the action sheet, a button's
// text for an alert, { text } for the prompt.
let answers = [];
const next = () => answers.shift();

beforeEach(() => {
  jest.clearAllMocks();
  answers = [];
  jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((opts, cb) => {
    const label = next();
    cb(label ? opts.options.indexOf(label) : opts.cancelButtonIndex);
  });
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons = []) => {
    const choice = next();
    buttons.find((b) => b.text === choice)?.onPress?.();
  });
  jest.spyOn(Alert, 'prompt').mockImplementation((title, message, buttons) => {
    const answer = next();
    if (answer === null) {
      buttons.find((b) => b.text === 'Cancel').onPress();
    } else {
      buttons.find((b) => b.text === 'Send').onPress(answer.text);
    }
  });
  reportContent.mockResolvedValue({ status: 201 });
  mockBlocks.block.mockResolvedValue({ ok: true });
  mockBlocks.unblock.mockResolvedValue({ ok: true });
  mockComments.deleteComment.mockResolvedValue({ ok: true });
});

// RNTL 14's renderHook is async.
const run = async (fn, options) => {
  const { result } = await renderHook(() => useSafetyActions(options));
  await act(() => fn(result.current));
};
const ada = { id: 'c1', userId: 'u-ada', username: 'ada', isMine: false };
const ctx = { bookId: 'bk_1', roomId: 'rm_1' };

it('offers the seven reasons (R1.2)', () => {
  expect(REPORT_REASONS.map((r) => r.label)).toEqual([
    'Harassment or bullying', 'Hate speech', 'Sexual content', 'Violence or threats',
    'Self-harm', 'Spam or scam', 'Something else',
  ]);
});

describe('reportComment', () => {
  it('sends, hides it, thanks, and offers to block (R1.4, R1.5)', async () => {
    answers = ['Spam or scam', 'Block ada'];
    await run((a) => a.reportComment(ada, ctx));

    expect(reportContent).toHaveBeenCalledWith({
      targetType: 'comment', targetId: 'c1', roomId: 'rm_1', reason: 'spam', details: '',
    });
    expect(mockComments.hideReported).toHaveBeenCalledWith('bk_1', 'c1');
    expect(Alert.alert.mock.calls[0][0]).toBe('Thanks. We\'ll take a look.');
    expect(mockBlocks.block).toHaveBeenCalledWith({ userId: 'u-ada', username: 'ada' });
    expect(showToast).toHaveBeenCalledWith('ada blocked', 'success');
  });

  it('needs words for "Something else", asking again when blank (R1.3)', async () => {
    answers = ['Something else', { text: '   ' }, { text: ' they keep spoiling ' }, 'Not now'];
    await run((a) => a.reportComment(ada, ctx));
    expect(Alert.prompt).toHaveBeenCalledTimes(2);
    expect(reportContent).toHaveBeenCalledWith(expect.objectContaining({ reason: 'other', details: 'they keep spoiling' }));
    expect(mockBlocks.block).not.toHaveBeenCalled();
  });

  it('sends nothing when they back out', async () => {
    answers = [undefined];
    await run((a) => a.reportComment(ada, ctx));
    answers = ['Something else', null];
    await run((a) => a.reportComment(ada, ctx));
    expect(reportContent).not.toHaveBeenCalled();
  });

  it('keeps the comment when sending fails (R1.6), and passes on the daily limit (R3.4)', async () => {
    reportContent.mockResolvedValueOnce({ status: 500 });
    answers = ['Hate speech'];
    await run((a) => a.reportComment(ada, ctx));
    expect(showToast).toHaveBeenLastCalledWith('Couldn\'t send your report. Try again.', 'error');
    expect(mockComments.hideReported).not.toHaveBeenCalled();

    reportContent.mockResolvedValueOnce({ status: 429, error: 'You\'ve sent a lot of reports today. Email us if it\'s urgent.' });
    answers = ['Hate speech'];
    await run((a) => a.reportComment(ada, ctx));
    expect(showToast).toHaveBeenLastCalledWith('You\'ve sent a lot of reports today. Email us if it\'s urgent.', 'error');
  });

  it('never acts on your own comment or a placeholder (R2.4)', async () => {
    await run((a) => a.reportComment({ ...ada, isMine: true }, ctx));
    await run((a) => a.reportComment({ ...ada, deleted: 'author' }, ctx));
    expect(ActionSheetIOS.showActionSheetWithOptions).not.toHaveBeenCalled();
  });
});

it('reports a reader and a room (R2)', async () => {
  answers = ['Harassment or bullying', 'Not now'];
  await run((a) => a.reportUser({ userId: 'u-ada', username: 'ada' }, { roomId: 'rm_1' }));
  expect(reportContent).toHaveBeenLastCalledWith(expect.objectContaining({ targetType: 'user', targetId: 'u-ada', roomId: 'rm_1' }));

  answers = ['Hate speech'];
  await run((a) => a.reportRoom({ id: 'rm_2' }));
  expect(reportContent).toHaveBeenLastCalledWith(expect.objectContaining({ targetType: 'room', targetId: 'rm_2' }));
  expect(Alert.alert).toHaveBeenLastCalledWith('Thanks. We\'ll take a look.');

  // Not yourself, not the Deleted reader.
  await run((a) => a.reportUser({ userId: 'u-me', username: 'me', isMe: true }));
  await run((a) => a.reportUser({ userId: '00000000-0000-0000-0000-000000000000', username: 'Deleted reader' }));
  expect(reportContent).toHaveBeenCalledTimes(2);
});

it('blocks after asking (R5.1, R5.2), and unblocks (R6.3)', async () => {
  answers = ['Cancel'];
  await run((a) => a.blockUser({ userId: 'u-ada', username: 'ada' }));
  expect(mockBlocks.block).not.toHaveBeenCalled();
  expect(Alert.alert.mock.calls[0].slice(0, 2)).toEqual([
    'Block ada?', 'You won\'t see their comments or rooms, and they won\'t be told.',
  ]);

  answers = ['Block'];
  await run((a) => a.blockUser({ userId: 'u-ada', username: 'ada' }));
  expect(showToast).toHaveBeenLastCalledWith('ada blocked', 'success');

  await run((a) => a.unblockUser({ userId: 'u-ada', username: 'ada' }));
  expect(showToast).toHaveBeenLastCalledWith('ada unblocked', 'success');
});

it('deletes your own comment after asking (R7.2, R7.5)', async () => {
  const mine = { id: 'c9', isMine: true };
  answers = ['Delete'];
  await run((a) => a.confirmDelete(mine, 'bk_1'));
  expect(Alert.alert.mock.calls[0].slice(0, 2)).toEqual(['Delete this comment?', 'This can\'t be undone.']);
  expect(mockComments.deleteComment).toHaveBeenCalledWith('bk_1', 'c9');

  mockComments.deleteComment.mockResolvedValueOnce({ ok: false });
  answers = ['Delete'];
  await run((a) => a.confirmDelete(mine, 'bk_1'));
  expect(showToast).toHaveBeenLastCalledWith('Couldn\'t delete your comment', 'error');

  // Someone else's: nothing to delete.
  await run((a) => a.confirmDelete({ id: 'c1', isMine: false }, 'bk_1'));
  expect(mockComments.deleteComment).toHaveBeenCalledTimes(2);
});

it('says things the caller\'s way when given one', async () => {
  const say = jest.fn();
  answers = ['Block'];
  await run((a) => a.blockUser({ userId: 'u-ada', username: 'ada' }), { say });
  expect(say).toHaveBeenCalledWith('ada blocked', 'success');
  expect(showToast).not.toHaveBeenCalled();
});
