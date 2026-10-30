// Deleting, reporting and blocking in the comments store (specs/report-block),
// against a mocked API layer.

jest.mock('@env', () => ({}), { virtual: true });
jest.mock('../../services/authenticatedRequests', () => ({
  makeAuthenticatedGetRequest: jest.fn(),
  makeAuthenticatedPostRequest: jest.fn(),
  makeAuthenticatedPatchRequest: jest.fn(),
  makeAuthenticatedDeleteRequest: jest.fn(),
}));
jest.mock('../../utils/enhancedStorage', () => ({
  __esModule: true,
  default: { getUserProfile: () => ({ username: 'me' }), readCache: () => null, writeCache: jest.fn() },
}));

import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from '../../services/authenticatedRequests';
import useCommentsStore from '../commentsStore';
import useOutboxStore from '../outboxStore';

const store = () => useCommentsStore.getState();
const clientError = (status, body) => new Error(`Client error ${status}: ${JSON.stringify(body)}`);

const raw = (id, user, extra = {}) => ({
  id, user_id: `u-${user}`, username: user, page: 1, body: `${user} says`, read: true, replies: [], ...extra,
});

// Two threads: mine with ada's reply, and ada's with my reply and bob's.
const load = async () => {
  makeAuthenticatedGetRequest.mockResolvedValue({
    status: 200,
    response: {
      threads: [
        { anchor_key: 'k1', page: 1, comments: [raw('c1', 'me', { replies: [raw('r1', 'ada', { read: false })] })], unread_count: 1 },
        { anchor_key: 'k2', page: 2, comments: [raw('c2', 'ada', { replies: [raw('r2', 'me'), raw('r3', 'bob')] })], unread_count: 0 },
        { anchor_key: 'k3', page: 3, comments: [raw('c3', 'me')], unread_count: 0 },
      ],
      locked_count: 0,
      unlocked_unread_count: 1,
    },
  });
  await store().loadComments('rm_1', 'bk_1');
};

const threads = () => store().byBook.bk_1.threads;

beforeEach(async () => {
  jest.clearAllMocks();
  useCommentsStore.setState({ byBook: {} });
  useOutboxStore.setState({ items: [], idMap: {} });
  await load();
});

it('knows which comments are mine (by username)', () => {
  expect(threads()[0].comments[0].isMine).toBe(true);
  expect(threads()[1].comments[0].isMine).toBe(false);
  expect(threads()[1].comments[0].replies[0].isMine).toBe(true);
});

describe('deleteComment', () => {
  it('turns a first comment with replies into a placeholder (R7.3)', async () => {
    makeAuthenticatedDeleteRequest.mockResolvedValue({ status: 204 });
    const done = store().deleteComment('bk_1', 'c1');

    const placeholder = threads()[0].comments[0];
    expect(placeholder).toMatchObject({ id: 'c1', deleted: 'author', body: '', username: '', likes: 0, isMine: false });
    expect(placeholder.replies.map((r) => r.id)).toEqual(['r1']);
    expect(await done).toEqual({ ok: true });
    expect(makeAuthenticatedDeleteRequest.mock.calls[0][0]).toMatch(/\/comments\/c1$/);
    expect(makeAuthenticatedDeleteRequest.mock.calls[0][1]).toEqual({ maxRetries: 0, quiet: true });
  });

  it('removes a comment without replies, and a reply, outright', async () => {
    makeAuthenticatedDeleteRequest.mockResolvedValue({ status: 204 });
    await store().deleteComment('bk_1', 'c3');
    await store().deleteComment('bk_1', 'r2');
    expect(threads().map((t) => t.anchorKey)).toEqual(['k1', 'k2']);
    expect(threads()[1].comments[0].replies.map((r) => r.id)).toEqual(['r3']);
  });

  it('puts it back when the API refuses (R7.5)', async () => {
    makeAuthenticatedDeleteRequest.mockRejectedValue(clientError(403, { error: 'You can only delete your own comments' }));
    expect(await store().deleteComment('bk_1', 'c3')).toEqual({ ok: false });
    expect(threads().map((t) => t.anchorKey)).toEqual(['k1', 'k2', 'k3']);

  });

  // specs/offline-first R3.1: with no connection it stays deleted and waits.
  it('keeps a delete that can\'t be sent', async () => {
    makeAuthenticatedDeleteRequest.mockRejectedValue(new TypeError('Network request failed'));
    expect(await store().deleteComment('bk_1', 'c1')).toEqual({ ok: true });
    expect(threads()[0].comments[0].deleted).toBe('author');
    expect(useOutboxStore.getState().items).toMatchObject([{ kind: 'comment.delete', ref: 'c1', roomId: 'rm_1' }]);
  });
});

it('hides what the reader reported, keeping replies under a placeholder (R1.4)', () => {
  store().hideReported('bk_1', 'c2');
  expect(threads()[1].comments[0]).toMatchObject({ hidden: 'reported', body: '', username: '' });
  expect(threads()[1].comments[0].replies).toHaveLength(2);

  // Its last replies going takes the placeholder with them.
  store().hideReported('bk_1', 'r3');
  store().hideReported('bk_1', 'r2');
  expect(threads().map((t) => t.anchorKey)).toEqual(['k1', 'k3']);
});

it('drops a blocked author everywhere at once, and their unread too (R5.2)', () => {
  store().dropAuthor('u-ada');
  expect(threads().map((t) => t.anchorKey)).toEqual(['k1', 'k3']);
  expect(threads()[0].comments[0].replies).toEqual([]);
  expect(store().byBook.bk_1.unreadCount).toBe(0);
});

it('marks a comment refused for its words, so the app offers Edit not Retry (R8.3)', async () => {
  makeAuthenticatedPostRequest.mockRejectedValue(
    clientError(400, { error: 'That includes words we don\'t allow.', code: 'blocked_words', field: 'body' }),
  );
  await expect(store().addComment({ roomId: 'rm_1', bookId: 'bk_1', page: 4, body: 'rude', anchorText: 'x' })).rejects.toThrow();
  const failed = threads().flatMap((t) => t.comments).find((c) => c.body === 'rude');
  expect(failed).toMatchObject({ failed: 'blocked_words', isMine: true, userId: null });

  store().discardFailed('bk_1', failed.clientId);
  expect(threads().flatMap((t) => t.comments).some((c) => c.body === 'rude')).toBe(false);

  // Any other failure is still a plain one, with Retry. (No connection is
  // different: that's kept and sent later, specs/offline-first R3.1.)
  makeAuthenticatedPostRequest.mockRejectedValue(new Error('Server error 500 after 3 attempts: down'));
  await expect(store().addComment({ roomId: 'rm_1', bookId: 'bk_1', page: 4, body: 'fine', anchorText: 'y' })).rejects.toThrow();
  expect(threads().flatMap((t) => t.comments).find((c) => c.body === 'fine').failed).toBe(true);
});
