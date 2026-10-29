// Comments offline: post, reply, delete (specs/offline-first R3.1, R3.4–R3.6,
// R3.10, R4.1, R4.2).

jest.mock('../../services/commentsService', () => ({
  fetchBookComments: jest.fn(),
  createComment: jest.fn(),
  markCommentsRead: jest.fn(),
  likeComment: jest.fn(),
  unlikeComment: jest.fn(),
}));
jest.mock('../../services/safetyService', () => ({ deleteComment: jest.fn() }));
jest.mock('../../utils/enhancedStorage', () => {
  const saved = {};
  return {
    __esModule: true,
    default: {
      getUserProfile: () => ({ username: 'me' }),
      readCache: (name) => saved[name] || null,
      writeCache: (name, value) => { saved[name] = value; },
      __saved: saved,
    },
  };
});

import enhancedStorage from '../../utils/enhancedStorage';
import { OfflineError } from '../../utils/apiError';
import { fetchBookComments, createComment, likeComment, unlikeComment, markCommentsRead } from '../../services/commentsService';
import { deleteComment as deleteCommentRequest } from '../../services/safetyService';
import useConnectivityStore from '../connectivityStore';
import useOutboxStore from '../outboxStore';
import useCommentsStore, { hydrateComments } from '../commentsStore';

const store = () => useCommentsStore.getState();
const outbox = () => useOutboxStore.getState();
const threads = () => store().byBook.bk_1?.threads || [];
const allComments = () => threads().flatMap((t) => t.comments.flatMap((c) => [c, ...c.replies]));
const byBody = (body) => allComments().find((c) => c.body === body);
const offline = () => Promise.reject(new OfflineError());

const row = (clientId, id, extra = {}) => ({
  status: 201,
  response: {
    id, client_id: clientId, user_id: 'u-me', username: 'me', page: 4, body: 'hi', read: true, replies: [],
    anchor: { key: 'srv_anchor' }, ...extra,
  },
});
const post = (body, extra = {}) => store().addComment({ roomId: 'rm_1', bookId: 'bk_1', page: 4, anchorText: 'x', body, ...extra });

beforeEach(() => {
  useConnectivityStore.setState({ online: true });
  useOutboxStore.setState({ items: [], idMap: {}, syncing: false, catchingUp: false });
  useCommentsStore.setState({ byBook: {} });
});

describe('posted offline', () => {
  it('stays on screen and waits in the outbox', async () => {
    createComment.mockImplementationOnce(offline);
    await expect(post('hi')).resolves.toMatchObject({ queued: true });
    expect(byBody('hi')).toMatchObject({ pending: true, queued: true, failed: false });
    expect(outbox().items).toMatchObject([{ kind: 'comment.add', roomId: 'rm_1', bookId: 'bk_1', ref: byBody('hi').clientId }]);
  });

  it('becomes the server\'s comment once sent, thread and all', async () => {
    createComment.mockImplementationOnce(offline);
    await post('hi');
    const { clientId } = byBody('hi');

    createComment.mockResolvedValueOnce(row(clientId, 'c_srv'));
    await outbox().flush();
    expect(byBody('hi')).toMatchObject({ id: 'c_srv', clientId, pending: false, queued: false });
    expect(threads()[0].anchorKey).toBe('srv_anchor');
  });

  it('a reply to it waits behind it and goes with its server id (R3.5)', async () => {
    createComment.mockImplementationOnce(offline);
    await post('hi');
    const parent = byBody('hi');

    // Online again, but the parent is still queued: the reply can't go first.
    await post('reply', { parentId: parent.id });
    expect(createComment).toHaveBeenCalledTimes(1);
    expect(byBody('reply')).toMatchObject({ queued: true, parentId: parent.clientId });

    createComment
      .mockResolvedValueOnce(row(parent.clientId, 'c_srv'))
      .mockImplementationOnce((roomId, bookId, comment) => Promise.resolve(row(comment.clientId, 'r_srv', { parent_id: comment.parentId, body: 'reply' })));
    await outbox().flush();
    expect(createComment.mock.calls[2][2]).toMatchObject({ parentId: 'c_srv' });
    expect(byBody('reply')).toMatchObject({ id: 'r_srv', queued: false });
  });

  it('flips to failed if refused later, and its reply with it (R3.6)', async () => {
    createComment.mockImplementationOnce(offline);
    await post('rude');
    await post('reply', { parentId: byBody('rude').id });

    createComment.mockRejectedValueOnce(new Error('Client error 400: {"code":"blocked_words"}'));
    await outbox().flush();
    expect(byBody('rude')).toMatchObject({ failed: 'blocked_words', pending: false, queued: false });
    expect(byBody('reply')).toMatchObject({ failed: true, queued: false });
    expect(createComment).toHaveBeenCalledTimes(2);
  });

  it('deleted before it was sent, never reaches the server (R3.4)', async () => {
    createComment.mockImplementationOnce(offline);
    await post('oops');
    await post('reply', { parentId: byBody('oops').id });

    expect(await store().deleteComment('bk_1', byBody('oops').id)).toEqual({ ok: true });
    expect(allComments()).toEqual([]);
    expect(outbox().items).toEqual([]);
    expect(deleteCommentRequest).not.toHaveBeenCalled();
  });

  it('a retry with no connection is kept, not failed again', async () => {
    createComment.mockRejectedValueOnce(new Error('Server error 500 after 3 attempts'));
    await expect(post('hi')).rejects.toThrow();
    createComment.mockImplementationOnce(offline);
    await store().retryComment('bk_1', byBody('hi').clientId);
    expect(byBody('hi')).toMatchObject({ queued: true, failed: false });
  });
});

describe('a reload (R3.10)', () => {
  const server = (threadsList) => ({ status: 200, response: { threads: threadsList, locked_count: 0, unlocked_unread_count: 0 } });
  const mine = { anchor_key: 'k1', page: 1, anchor_text: 'a', comments: [{ id: 'c1', user_id: 'u-me', username: 'me', page: 1, body: 'old', replies: [] }] };

  it('keeps comments still waiting to be sent', async () => {
    fetchBookComments.mockResolvedValueOnce(server([mine]));
    await store().loadComments('rm_1', 'bk_1');
    createComment.mockImplementation(offline);
    await post('new');
    await post('reply', { parentId: 'c1' });

    fetchBookComments.mockResolvedValueOnce(server([mine]));
    await store().loadComments('rm_1', 'bk_1');
    expect(byBody('new')).toMatchObject({ queued: true });
    expect(byBody('reply')).toMatchObject({ queued: true });
    expect(threads().find((t) => t.anchorKey === 'k1').comments[0].replies.map((r) => r.body)).toEqual(['reply']);
    createComment.mockReset();
  });

  it('keeps a comment refused once back online, for Edit or Discard (R3.6)', async () => {
    fetchBookComments.mockResolvedValueOnce(server([mine]));
    await store().loadComments('rm_1', 'bk_1');
    createComment.mockImplementationOnce(offline);
    await post('rude');
    createComment.mockRejectedValueOnce(new Error('Client error 400: {"code":"blocked_words"}'));
    await outbox().flush();

    fetchBookComments.mockResolvedValueOnce(server([mine]));
    await store().loadComments('rm_1', 'bk_1');
    expect(byBody('rude')).toMatchObject({ failed: 'blocked_words' });
  });

  it('leaves out a comment deleted offline that the server still has', async () => {
    fetchBookComments.mockResolvedValueOnce(server([mine]));
    await store().loadComments('rm_1', 'bk_1');
    deleteCommentRequest.mockImplementationOnce(offline);
    await store().deleteComment('bk_1', 'c1');

    fetchBookComments.mockResolvedValueOnce(server([mine]));
    await store().loadComments('rm_1', 'bk_1');
    expect(byBody('old')).toBeUndefined();
  });
});

describe('on the device (R4.1, R4.2)', () => {
  const entry = (loadedAt, comments) => ({
    roomId: 'rm_1', threads: [{ anchorKey: 'k', page: 1, comments }], lockedCount: 0, unreadCount: 0, furthestPage: 0, loading: true, loadedAt,
  });
  const comment = (body, extra = {}) => ({ id: body, clientId: body, body, replies: [], pending: false, failed: false, ...extra });

  it('comes back after a restart; one mid-request comes back failed, with Retry', () => {
    enhancedStorage.writeCache('comments', {
      byBook: {
        bk_1: entry(1, [
          comment('saved'),
          comment('sending', { pending: true }),
          comment('queued', { pending: true, queued: true }),
        ]),
      },
    });
    hydrateComments();
    expect(byBody('saved')).toMatchObject({ pending: false, failed: false });
    expect(byBody('sending')).toMatchObject({ pending: false, failed: true });
    expect(byBody('queued')).toMatchObject({ pending: true, queued: true });
  });

  it('keeps the 30 books loaded most recently, and any with a comment to send', () => {
    const byBook = {};
    for (let i = 0; i < 35; i += 1) {
      byBook[`b${i}`] = entry(i + 100, [comment(`c${i}`)]);
    }
    byBook.old_queued = entry(1, [comment('q', { pending: true, queued: true })]);
    useCommentsStore.setState({ byBook });
    const kept = enhancedStorage.__saved.comments.byBook;
    expect(Object.keys(kept)).toHaveLength(31);
    expect(kept.b0).toBeUndefined();
    expect(kept.old_queued).toBeDefined();
    expect(kept.b34.loading).toBe(false);
  });
});

describe('likes and reads (R3.1, R3.4, R3.6)', () => {
  const server = {
    status: 200,
    response: {
      threads: [
        { anchor_key: 'k1', page: 1, anchor_text: 'a', unread_count: 1, comments: [
          { id: 'c1', user_id: 'u-ada', username: 'ada', page: 1, body: 'one', likes: 2, read: false, replies: [] },
        ] },
        { anchor_key: 'k2', page: 2, anchor_text: 'b', unread_count: 1, comments: [
          { id: 'c2', user_id: 'u-bo', username: 'bo', page: 2, body: 'two', likes: 0, read: false, replies: [] },
        ] },
      ],
      locked_count: 0,
      unlocked_unread_count: 2,
    },
  };

  beforeEach(async () => {
    fetchBookComments.mockResolvedValue(server);
    await store().loadComments('rm_1', 'bk_1');
    likeComment.mockResolvedValue({ status: 204 });
    unlikeComment.mockResolvedValue({ status: 204 });
    markCommentsRead.mockResolvedValue({ status: 204 });
  });

  it('a like offline shows at once and is sent when back', async () => {
    useConnectivityStore.setState({ online: false });
    await store().toggleLike('bk_1', 'c1');
    expect(byBody('one')).toMatchObject({ likedByMe: true, likes: 3 });
    expect(likeComment).not.toHaveBeenCalled();

    useConnectivityStore.setState({ online: true });
    await outbox().flush();
    expect(likeComment).toHaveBeenCalledWith('c1', { quiet: true });
    expect(outbox().items).toEqual([]);
  });

  it('only the last of several taps is sent', async () => {
    useConnectivityStore.setState({ online: false });
    await store().toggleLike('bk_1', 'c1');
    await store().toggleLike('bk_1', 'c1');
    await store().toggleLike('bk_1', 'c1');
    expect(outbox().items).toMatchObject([{ kind: 'comment.like', ref: 'c1', payload: { liked: true, before: false } }]);

    useConnectivityStore.setState({ online: true });
    // Back online, the next tap replaces the queued one rather than racing it.
    await store().toggleLike('bk_1', 'c1');
    expect(likeComment).not.toHaveBeenCalled();
    expect(unlikeComment).toHaveBeenCalledTimes(1);
    expect(byBody('one')).toMatchObject({ likedByMe: false, likes: 2 });
  });

  it('a refused like goes back to what the server has', async () => {
    useConnectivityStore.setState({ online: false });
    await store().toggleLike('bk_1', 'c1');
    useConnectivityStore.setState({ online: true });
    likeComment.mockRejectedValueOnce(new Error('Client error 404: {}'));
    await outbox().flush();
    expect(byBody('one')).toMatchObject({ likedByMe: false, likes: 2 });
  });

  it('can\'t like a comment that isn\'t saved yet', async () => {
    createComment.mockImplementationOnce(offline);
    await post('mine');
    await store().toggleLike('bk_1', byBody('mine').id);
    expect(byBody('mine').likedByMe).toBe(false);
    expect(outbox().items.map((i) => i.kind)).toEqual(['comment.add']);
  });

  it('threads read offline go as one receipt per book', async () => {
    useConnectivityStore.setState({ online: false });
    await store().markThreadRead('bk_1', 'k1');
    await store().markThreadRead('bk_1', 'k2');
    expect(store().byBook.bk_1.unreadCount).toBe(0);
    expect(outbox().items).toMatchObject([{ kind: 'comment.read', payload: { commentIds: ['c1', 'c2'] } }]);

    useConnectivityStore.setState({ online: true });
    await outbox().flush();
    expect(markCommentsRead).toHaveBeenCalledTimes(1);
    expect(markCommentsRead).toHaveBeenCalledWith('rm_1', 'bk_1', ['c1', 'c2'], { quiet: true });
  });

  it('a refused receipt asks the server again', async () => {
    useConnectivityStore.setState({ online: false });
    await store().markThreadRead('bk_1', 'k1');
    useConnectivityStore.setState({ online: true });
    markCommentsRead.mockRejectedValueOnce(new Error('Client error 403: {}'));
    fetchBookComments.mockClear();
    await outbox().flush();
    expect(fetchBookComments).toHaveBeenCalledWith('rm_1', 'bk_1');
  });
});
