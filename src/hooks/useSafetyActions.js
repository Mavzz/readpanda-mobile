import { useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { showToast } from '../components/Toaster';
import { askText } from '../components/SafetySheetHost';
import { reportContent } from '../services/safetyService';
import useCommentsStore from '../stores/commentsStore';
import useBlocksStore from '../stores/blocksStore';
import pickReason from './pickReason';
import chooseAction from './chooseAction';

// Report, block and delete, in one place for every screen that offers them
// (specs/report-block): the reader's comment sheet, the room page's and
// Home's threads, the member list, the room menu and the open-room preview.
//
// The steps are system sheets and alerts on iOS, so they present over the
// native comment sheet too. Android has neither ActionSheetIOS nor
// Alert.prompt, so SafetySheetHost draws those two steps there (see
// pickReason.android.js).

export const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'violence', label: 'Violence or threats' },
  { id: 'self_harm', label: 'Self-harm' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'other', label: 'Something else' },
];

const MAX_DETAILS = 500;
const DELETED_READER_ID = '00000000-0000-0000-0000-000000000000';

// Blocking a room's creator doesn't take you out of their room (R5.6), so
// say so before someone expects it to.
const BLOCK_BODY = 'You won\'t see their comments or rooms, and they won\'t be told. You\'ll stay in any rooms you share.';

// R1.3: a few words for "Something else", up to 500 characters. Nothing is
// sent without them: a blank answer asks again.
const askDetails = async () => {
  const title = 'Tell us what\'s wrong';
  const message = 'A few words, so we know what to look for.';
  for (;;) {
    const text = Platform.OS === 'ios'
      ? await new Promise((resolve) => {
        Alert.prompt(title, message, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          { text: 'Send', onPress: (value) => resolve(value ?? '') },
        ], 'plain-text');
      })
      : await askText(title, message, MAX_DETAILS);
    if (text === null) {
      return null;
    }
    if (text.trim()) {
      return text.trim().slice(0, MAX_DETAILS);
    }
  }
};

const confirm = (title, message, action) =>
  new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });

// Readers you can act on: never yourself or the Deleted reader (R2.4).
const actionable = (person) =>
  !!person?.userId && person.userId !== DELETED_READER_ID && !person.isMine && !person.isMe;

// `say(message, type)` shows the short outcomes ("ada blocked"). A toast by
// default; a screen showing a native sheet passes one that can be seen over
// it.
const useSafetyActions = ({ say = showToast } = {}) => {
  const hideReported = useCommentsStore((s) => s.hideReported);
  const deleteComment = useCommentsStore((s) => s.deleteComment);
  const block = useBlocksStore((s) => s.block);
  const unblock = useBlocksStore((s) => s.unblock);

  const blockNow = useCallback(async (person) => {
    const { ok } = await block({ userId: person.userId, username: person.username });
    say(ok ? `${person.username} blocked` : `Couldn't block ${person.username}. Try again.`, ok ? 'success' : 'error');
    return ok;
  }, [block, say]);

  // Reason, maybe words, then the report. Returns true once it's sent.
  const report = useCallback(async (title, target) => {
    const reason = await pickReason(title, REPORT_REASONS);
    if (!reason) {
      return false;
    }
    let details = '';
    if (reason === 'other') {
      details = await askDetails();
      if (details === null) {
        return false;
      }
    }
    try {
      const res = await reportContent({ ...target, reason, details });
      if (res.status === 201 || res.status === 200) {
        return true;
      }
      // 429 carries its own words (R3.4).
      say(res.status === 429 && res.error ? res.error : 'Couldn\'t send your report. Try again.', 'error');
      return false;
    } catch {
      say('Couldn\'t send your report. Try again.', 'error');
      return false;
    }
  }, [say]);

  // R1.4, R1.5: thanks, and the offer to block, in one alert that shows over
  // any sheet.
  const thankAndOfferBlock = useCallback(async (person) => {
    if (!actionable(person)) {
      Alert.alert('Thanks. We\'ll take a look.');
      return;
    }
    const wantsBlock = await new Promise((resolve) => {
      Alert.alert(
        'Thanks. We\'ll take a look.',
        `Do you want to block ${person.username} too? ${BLOCK_BODY}`,
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          { text: `Block ${person.username}`, style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (wantsBlock) {
      await blockNow(person);
    }
  }, [blockNow]);

  // R1: someone else's comment. ctx: { bookId, roomId }. Hidden for the
  // reader once sent, never before (R1.6).
  const reportComment = useCallback(async (comment, { bookId, roomId } = {}) => {
    if (!comment?.id || comment.isMine || comment.deleted || comment.hidden) {
      return;
    }
    const sent = await report('Report comment', { targetType: 'comment', targetId: comment.id, roomId });
    if (!sent) {
      return;
    }
    if (bookId) {
      hideReported(bookId, comment.id);
    }
    await thankAndOfferBlock({ userId: comment.userId, username: comment.username });
  }, [report, hideReported, thankAndOfferBlock]);

  // R2.1: a reader, from a room's member list. ctx: { roomId }.
  const reportUser = useCallback(async (person, { roomId } = {}) => {
    if (!actionable(person)) {
      return;
    }
    const sent = await report(`Report ${person.username}`, { targetType: 'user', targetId: person.userId, roomId });
    if (sent) {
      await thankAndOfferBlock(person);
    }
  }, [report, thankAndOfferBlock]);

  // R2.2: a room, from its page or its open-room preview.
  const reportRoom = useCallback(async (room) => {
    if (!room?.id) {
      return;
    }
    const sent = await report('Report room', { targetType: 'room', targetId: room.id, roomId: room.id });
    if (sent) {
      Alert.alert('Thanks. We\'ll take a look.');
    }
  }, [report]);

  // R5.1, R5.2: person is { userId, username }.
  const blockUser = useCallback(async (person) => {
    if (!actionable(person)) {
      return false;
    }
    if (!(await confirm(`Block ${person.username}?`, BLOCK_BODY, 'Block'))) {
      return false;
    }
    return blockNow(person);
  }, [blockNow]);

  // R6.3: no confirmation; it's undone as easily.
  const unblockUser = useCallback(async (person) => {
    const { ok } = await unblock(person.userId);
    say(ok ? `${person.username} unblocked` : `Couldn't unblock ${person.username}. Try again.`, ok ? 'success' : 'error');
    return ok;
  }, [unblock, say]);

  // R7.2, R7.5: one of your own comments.
  const confirmDelete = useCallback(async (comment, bookId) => {
    if (!comment?.id || !comment.isMine || !bookId) {
      return false;
    }
    if (!(await confirm('Delete this comment?', 'This can\'t be undone.', 'Delete'))) {
      return false;
    }
    const { ok } = await deleteComment(bookId, comment.id);
    if (!ok) {
      say('Couldn\'t delete your comment', 'error');
    }
    return ok;
  }, [deleteComment, say]);

  // A comment's ⋯ (R1.1, R7.1): Delete for your own, Report and Block for
  // anyone else's. ctx: { bookId, roomId }.
  const commentMenu = useCallback(async (comment, ctx = {}) => {
    if (!comment?.id || comment.deleted || comment.hidden) {
      return;
    }
    if (comment.isMine) {
      await confirmDelete(comment, ctx.bookId);
      return;
    }
    if (!actionable(comment)) {
      return;
    }
    const choice = await chooseAction(`${comment.username}'s comment`, [
      { id: 'report', label: 'Report comment' },
      { id: 'block', label: `Block ${comment.username}`, destructive: true },
    ]);
    if (choice === 'report') {
      await reportComment(comment, ctx);
    } else if (choice === 'block') {
      await blockUser(comment);
    }
  }, [confirmDelete, reportComment, blockUser]);

  // A tapped member (R2.1): Report, and Block or Unblock. person:
  // { userId, username, blocked }. ctx: { roomId }.
  const memberMenu = useCallback(async (person, ctx = {}) => {
    if (!actionable(person)) {
      return;
    }
    const choice = await chooseAction(person.username, [
      { id: 'report', label: `Report ${person.username}` },
      person.blocked
        ? { id: 'unblock', label: `Unblock ${person.username}` }
        : { id: 'block', label: `Block ${person.username}`, destructive: true },
    ]);
    if (choice === 'report') {
      await reportUser(person, ctx);
    } else if (choice === 'block') {
      await blockUser(person);
    } else if (choice === 'unblock') {
      await unblockUser(person);
    }
  }, [reportUser, blockUser, unblockUser]);

  // A room's ⋯ (R2.2), for everyone but its creator.
  const roomMenu = useCallback(async (room) => {
    const choice = await chooseAction(room?.name || 'Room', [{ id: 'report', label: 'Report room' }]);
    if (choice === 'report') {
      await reportRoom(room);
    }
  }, [reportRoom]);

  return useMemo(() => ({
    reportComment, reportUser, reportRoom, blockUser, unblockUser, confirmDelete, commentMenu, memberMenu, roomMenu,
  }), [reportComment, reportUser, reportRoom, blockUser, unblockUser, confirmDelete, commentMenu, memberMenu, roomMenu]);
};

export default useSafetyActions;
