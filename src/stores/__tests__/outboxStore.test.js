// The outbox: what's kept offline and how it's sent (specs/offline-first R3).

jest.mock('../../utils/enhancedStorage', () => {
  const saved = {};
  return {
    __esModule: true,
    default: {
      getUserProfile: jest.fn(() => ({ username: 'ada' })),
      readCache: jest.fn((name) => saved[name] || null),
      writeCache: jest.fn((name, value) => { saved[name] = value; }),
    },
  };
});

import enhancedStorage from '../../utils/enhancedStorage';
import { OfflineError } from '../../utils/apiError';
import useConnectivityStore from '../connectivityStore';
import useOutboxStore, { registerOutboxHandlers, hydrateOutbox } from '../outboxStore';

const clientError = (status) => new Error(`Client error ${status}: {"error":"no"}`);
const ok = (response = null) => ({ status: 200, response });

const outbox = () => useOutboxStore.getState();
const kinds = () => outbox().items.map((i) => i.kind);

let sent;
let accepted;
let rejected;

// One handler for every kind, answering from `answers` (by kind or ref).
const answers = {};
const KINDS = ['progress', 'highlight.add', 'highlight.remove', 'comment.add', 'comment.like',
  'comment.read', 'comment.delete', 'notification.read'];

beforeEach(() => {
  sent = [];
  accepted = [];
  rejected = [];
  Object.keys(answers).forEach((k) => delete answers[k]);
  useConnectivityStore.setState({ online: true });
  enhancedStorage.getUserProfile.mockImplementation(() => ({ username: 'ada' }));
  useOutboxStore.setState({ items: [], idMap: {}, syncing: false, catchingUp: false });
  KINDS.forEach((kind) => registerOutboxHandlers(kind, {
    send: jest.fn(async (item) => {
      sent.push(item);
      const answer = answers[item.ref] ?? answers[kind];
      if (answer instanceof Error) {
        throw answer;
      }
      return typeof answer === 'function' ? answer(item) : ok(answer);
    }),
    onAccepted: (item) => accepted.push(item),
    onRejected: (item) => rejected.push(item),
  }));
});

describe('collapsing (R3.4)', () => {
  it('keeps only the latest progress per book', () => {
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: { currentPage: 3, readAt: 1 } });
    outbox().enqueue({ kind: 'progress', bookId: 'b2', payload: { currentPage: 9, readAt: 2 } });
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: { currentPage: 5, readAt: 3 } });
    expect(outbox().items.map((i) => [i.bookId, i.payload.currentPage, i.payload.readAt]))
      .toEqual([['b2', 9, 2], ['b1', 5, 3]]);
  });

  it('keeps only the last like or unlike per comment', () => {
    outbox().enqueue({ kind: 'comment.like', ref: 'c1', payload: { liked: true } });
    outbox().enqueue({ kind: 'comment.like', ref: 'c2', payload: { liked: true } });
    outbox().enqueue({ kind: 'comment.like', ref: 'c1', payload: { liked: false } });
    expect(outbox().items.map((i) => [i.ref, i.payload.liked])).toEqual([['c2', true], ['c1', false]]);
  });

  it('drops a highlight added and removed before syncing, both halves', () => {
    outbox().enqueue({ kind: 'highlight.add', bookId: 'b1', ref: 'h_tmp' });
    expect(outbox().enqueue({ kind: 'highlight.remove', bookId: 'b1', ref: 'h_tmp' })).toEqual({ cancelled: true });
    expect(outbox().items).toEqual([]);
  });

  it('queues removing a highlight the server already has', () => {
    expect(outbox().enqueue({ kind: 'highlight.remove', bookId: 'b1', ref: 'h_server' })).toEqual({ cancelled: false });
    expect(kinds()).toEqual(['highlight.remove']);
  });

  it('drops a comment posted and deleted before syncing, with what hangs off it', () => {
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_a' });
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_reply', parentRef: 'cmt_a' });
    outbox().enqueue({ kind: 'comment.like', ref: 'cmt_reply', payload: { liked: true } });
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_other' });
    expect(outbox().enqueue({ kind: 'comment.delete', bookId: 'b1', ref: 'cmt_a' })).toEqual({ cancelled: true });
    expect(outbox().items.map((i) => i.ref)).toEqual(['cmt_other']);
  });

  it('merges comment reads for a book into one item', () => {
    outbox().enqueue({ kind: 'comment.read', bookId: 'b1', roomId: 'r1', payload: { commentIds: ['1', '2'] } });
    outbox().enqueue({ kind: 'comment.read', bookId: 'b2', roomId: 'r1', payload: { commentIds: ['9'] } });
    outbox().enqueue({ kind: 'comment.read', bookId: 'b1', roomId: 'r1', payload: { commentIds: ['2', '3'] } });
    expect(outbox().items.map((i) => [i.bookId, i.payload.commentIds])).toEqual([['b1', ['1', '2', '3']], ['b2', ['9']]]);
  });

  it('marks a notification read once', () => {
    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    expect(kinds()).toEqual(['notification.read']);
  });
});

describe('flush (R3.3, R3.5–R3.7)', () => {
  it('sends in the order things were done and empties the queue', async () => {
    outbox().enqueue({ kind: 'highlight.add', bookId: 'b1', ref: 'h1' });
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    await outbox().flush();
    expect(sent.map((i) => i.kind)).toEqual(['highlight.add', 'progress', 'notification.read']);
    expect(accepted).toHaveLength(3);
    expect(outbox().items).toEqual([]);
    expect(outbox().syncing).toBe(false);
  });

  it('sends what refers to a queued comment with the server id it got', async () => {
    answers.cmt_a = { id: 'srv_1' };
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_a' });
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_r', parentRef: 'cmt_a' });
    outbox().enqueue({ kind: 'comment.like', ref: 'cmt_a', payload: { liked: true } });
    await outbox().flush();
    expect(sent[1].parentRef).toBe('srv_1');
    expect(sent[2].ref).toBe('srv_1');
    // The handler sees the item as queued, so it can find its row by clientId.
    expect(accepted[0].ref).toBe('cmt_a');
  });

  it('removes and reports a write the server refuses, then carries on', async () => {
    answers['highlight.add'] = clientError(400);
    outbox().enqueue({ kind: 'highlight.add', bookId: 'b1', ref: 'h1' });
    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    await outbox().flush();
    expect(rejected.map((i) => i.ref)).toEqual(['h1']);
    expect(accepted.map((i) => i.ref)).toEqual(['n1']);
    expect(outbox().items).toEqual([]);
  });

  it('refuses a reply whose comment was refused, without sending it', async () => {
    answers.cmt_a = clientError(400);
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_a' });
    outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_r', parentRef: 'cmt_a' });
    await outbox().flush();
    expect(sent).toHaveLength(1);
    expect(rejected.map((i) => i.ref)).toEqual(['cmt_a', 'cmt_r']);
  });

  it.each(['comment.delete', 'highlight.remove'])('counts a 404 on %s as done', async (kind) => {
    answers[kind] = clientError(404);
    outbox().enqueue({ kind, bookId: 'b1', ref: 'x1' });
    await outbox().flush();
    expect(accepted.map((i) => i.kind)).toEqual([kind]);
    expect(rejected).toEqual([]);
  });

  it.each([
    ['no answer', new TypeError('Network request failed')],
    ['offline', new OfflineError()],
    ['a 5xx', new Error('Server error 503 after 3 attempts: down')],
  ])('keeps the item and stops on %s', async (_, error) => {
    answers['progress'] = error;
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    await outbox().flush();
    expect(sent).toHaveLength(1);
    expect(kinds()).toEqual(['progress', 'notification.read']);
    expect(rejected).toEqual([]);
  });

  it('does nothing offline', async () => {
    useConnectivityStore.setState({ online: false });
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    await outbox().flush();
    expect(sent).toEqual([]);
  });

  it('runs one flush at a time and picks up what was queued meanwhile', async () => {
    let release;
    answers['progress'] = () => new Promise((r) => { release = () => r(ok()); });
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    const first = outbox().flush();
    expect(outbox().flush()).toBe(first);
    expect(outbox().syncing).toBe(true);

    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    release();
    await first;
    expect(sent.map((i) => i.kind)).toEqual(['progress', 'notification.read']);
  });

  it('can\'t cancel a write that is already being sent', async () => {
    let release;
    answers.h1 = () => new Promise((r) => { release = () => r(ok({ id: 'srv_h1' })); });
    outbox().enqueue({ kind: 'highlight.add', bookId: 'b1', ref: 'h1' });
    const run = outbox().flush();
    // Removed while its add is in flight: the remove queues behind it.
    expect(outbox().enqueue({ kind: 'highlight.remove', bookId: 'b1', ref: 'h1' })).toEqual({ cancelled: false });
    release();
    await run;
    expect(sent.map((i) => [i.kind, i.ref])).toEqual([['highlight.add', 'h1'], ['highlight.remove', 'srv_h1']]);
  });

  it('stops if the account changes mid-flush', async () => {
    answers['progress'] = () => {
      enhancedStorage.getUserProfile.mockImplementation(() => null);
      return ok();
    };
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    outbox().enqueue({ kind: 'notification.read', ref: 'n1' });
    await outbox().flush();
    expect(sent.map((i) => i.kind)).toEqual(['progress']);
  });

  it('waits for a store that hasn\'t registered its handler yet', async () => {
    outbox().enqueue({ kind: 'some.later.kind', ref: 'z' });
    await outbox().flush();
    expect(kinds()).toEqual(['some.later.kind']);

    // A flush that ended without sending anything doesn't block the next.
    registerOutboxHandlers('some.later.kind', { send: async () => ok() });
    await outbox().flush();
    expect(outbox().items).toEqual([]);
  });
});

it('survives a restart (R3.2)', () => {
  outbox().enqueue({ kind: 'comment.add', bookId: 'b1', ref: 'cmt_a' });
  const items = outbox().items;
  useOutboxStore.setState({ items: [], idMap: {} });
  // A cleared store writes [] too, so put the saved copy back as a relaunch
  // would find it.
  enhancedStorage.writeCache('outbox', { items, idMap: {} });
  hydrateOutbox();
  expect(outbox().items).toEqual(items);
});

describe('catching up after reconnecting (R2.2)', () => {
  it('is flagged for the length of the flush', async () => {
    let release;
    answers['progress'] = () => new Promise((r) => { release = () => r(ok()); });
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    const run = outbox().catchUp();
    expect(outbox().catchingUp).toBe(true);
    // catchUp is async, so the send starts a tick later.
    await new Promise(setImmediate);
    expect(outbox().catchingUp).toBe(true);
    release();
    await run;
    expect(outbox().catchingUp).toBe(false);
  });

  it('ends when an item fails, though items remain', async () => {
    answers['progress'] = new TypeError('Network request failed');
    outbox().enqueue({ kind: 'progress', bookId: 'b1', payload: {} });
    await outbox().catchUp();
    expect(outbox().catchingUp).toBe(false);
    expect(kinds()).toEqual(['progress']);
  });

  it('isn\'t flagged with nothing to send', async () => {
    const run = outbox().catchUp();
    expect(outbox().catchingUp).toBe(false);
    await run;
  });
});
