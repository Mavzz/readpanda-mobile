import { create } from 'zustand';
import log from '../utils/logger';
import enhancedStorage from '../utils/enhancedStorage';
import { isNetworkError, statusOfError } from '../utils/apiError';
import { isOnline } from './connectivityStore';
import persistSlice from './persistSlice';

// What the reader did offline, kept on the device until the server has it
// (specs/offline-first R3).
//
// The stores own what the reader sees. When one of their writes can't reach
// the server it lands here instead of being rolled back, and the store
// registers how to send it and what to do with the answer
// (registerOutboxHandlers), so this file never imports a store.
//
// An item:
//   { id, kind, bookId, roomId, ref, parentRef, payload, createdAt }
// `ref` is what the item is about: a comment or highlight's clientId while
// it's still queued, its server id once it isn't. `parentRef` is a reply's
// parent, the same way. Items go out one at a time, oldest first, so a
// comment is always accepted before anything that refers to it; `idMap`
// turns its clientId into the server's id on the way out (R3.5).

const newItemId = () =>
  `obx_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

const handlers = {};

// { send(item) → Promise<{ status, response }>, onAccepted(item, result),
//   onRejected(item, error) }. `send` gets the item with `ref` and
// `parentRef` already resolved to server ids.
export const registerOutboxHandlers = (kind, handler) => {
  handlers[kind] = handler;
};

// A delete or removal the server says is already gone did what it meant to.
const alreadyDone = (item, error) =>
  (item.kind === 'comment.delete' || item.kind === 'highlight.remove') && statusOfError(error) === 404;

// A 4xx: the server heard it and said no. Anything else (no answer, a 5xx,
// an expired session) may work next time.
const isRejection = (error) => {
  const status = statusOfError(error);
  return status !== null && status >= 400 && status < 500;
};

// Everything that refers to `ref`, following replies down: what has to go
// when a queued comment is deleted before it was ever sent.
const withDependents = (items, ref) => {
  const dead = new Set([ref]);
  let grew = true;
  while (grew) {
    grew = false;
    items.forEach((i) => {
      if (i.kind === 'comment.add' && dead.has(i.parentRef) && !dead.has(i.ref)) {
        dead.add(i.ref);
        grew = true;
      }
    });
  }
  return dead;
};

const currentAccount = () => enhancedStorage.getUserProfile()?.username || null;

let inFlightId = null;
let flushing = null;

const useOutboxStore = create((set, get) => ({
  items: [],
  // { [clientId]: serverId } for queued writes the server has accepted.
  idMap: {},
  // True while a flush is sending.
  syncing: false,
  // True while catching up after the connection came back: the one flush
  // the pill says "Syncing…" for (R2.2). Not every flush, or a page turn
  // online would flash it.
  catchingUp: false,

  // Queue a write, collapsing what it cancels or replaces (R3.4). Returns
  // { cancelled: true } when the write undid one still queued, so there's
  // nothing to send at all.
  enqueue: ({ kind, bookId = null, roomId = null, ref = null, parentRef = null, payload = {} }) => {
    const item = { id: newItemId(), kind, bookId, roomId, ref, parentRef, payload, createdAt: Date.now() };
    const { items } = get();
    // The item being sent can't be taken back: the server may already have
    // it. Anything that cancels it queues behind it instead.
    const queuedAdd = (addKind) => items.find((i) => i.kind === addKind && i.ref === ref && i.id !== inFlightId);

    switch (kind) {
    case 'progress':
      // Only where the reader got to matters, and when (R9.1).
      set({ items: [...items.filter((i) => !(i.kind === 'progress' && i.bookId === bookId)), item] });
      return { cancelled: false };

    case 'comment.like':
      set({ items: [...items.filter((i) => !(i.kind === 'comment.like' && i.ref === ref)), item] });
      return { cancelled: false };

    case 'notification.read':
      if (!items.some((i) => i.kind === 'notification.read' && i.ref === ref)) {
        set({ items: [...items, item] });
      }
      return { cancelled: false };

    case 'comment.read': {
      const existing = items.find((i) => i.kind === 'comment.read' && i.bookId === bookId
          && i.roomId === roomId && i.id !== inFlightId);
      if (!existing) {
        set({ items: [...items, item] });
        return { cancelled: false };
      }
      const commentIds = [...new Set([...existing.payload.commentIds, ...payload.commentIds])];
      set({
        items: items.map((i) => (i.id === existing.id ? { ...i, payload: { ...i.payload, commentIds } } : i)),
      });
      return { cancelled: false };
    }

    case 'highlight.remove':
      if (queuedAdd('highlight.add')) {
        set({ items: items.filter((i) => !(i.kind === 'highlight.add' && i.ref === ref)) });
        return { cancelled: true };
      }
      set({ items: [...items, item] });
      return { cancelled: false };

    case 'comment.delete':
      if (queuedAdd('comment.add')) {
        const dead = withDependents(items, ref);
        set({ items: items.filter((i) => !dead.has(i.ref) && !dead.has(i.parentRef)) });
        return { cancelled: true };
      }
      set({ items: [...items, item] });
      return { cancelled: false };

    default:
      set({ items: [...items, item] });
      return { cancelled: false };
    }
  },

  // Send the queue, oldest first (R3.3). One flush at a time: a second call
  // while one runs gets the same promise, and items queued meanwhile are
  // picked up by the running loop.
  //
  // It stops, keeping the item, on anything that might work later: offline,
  // no answer, a 5xx (R3.7). It also stops if the account changes under it.
  flush: () => {
    if (flushing) {
      return flushing;
    }
    if (!isOnline() || get().items.length === 0) {
      return Promise.resolve();
    }

    const run = async () => {
      const account = currentAccount();
      // clientIds of comments the server refused: whatever hangs off them
      // can't be sent either.
      const dead = new Set();
      set({ syncing: true });

      const remove = (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      const resolve = (ref) => (ref ? get().idMap[ref] || ref : ref);
      const call = (fn, ...args) => {
        try {
          fn?.(...args);
        } catch (e) {
          log.error('Outbox handler failed:', e);
        }
      };

      try {
        while (isOnline() && currentAccount() === account) {
          const item = get().items[0];
          if (!item) {
            break;
          }
          const handler = handlers[item.kind];
          if (!handler) {
            // Its store hasn't loaded yet. Leave it for the next flush rather
            // than lose it.
            log.warn(`No outbox handler for ${item.kind} yet`);
            break;
          }

          if (dead.has(item.ref) || dead.has(item.parentRef)) {
            remove(item.id);
            if (item.kind === 'comment.add') {
              dead.add(item.ref);
            }
            call(handler.onRejected, item, new Error('What it refers to was rejected'));
            continue;
          }

          inFlightId = item.id;
          try {
            const result = await handler.send({ ...item, ref: resolve(item.ref), parentRef: resolve(item.parentRef) });
            remove(item.id);
            const serverId = result?.response?.id;
            if (item.kind.endsWith('.add') && item.ref && serverId) {
              set((s) => ({ idMap: { ...s.idMap, [item.ref]: serverId } }));
            }
            call(handler.onAccepted, item, result);
          } catch (error) {
            if (alreadyDone(item, error)) {
              remove(item.id);
              call(handler.onAccepted, item, null);
            } else if (isRejection(error)) {
              log.warn(`Outbox: server refused ${item.kind}`, error);
              remove(item.id);
              if (item.kind === 'comment.add') {
                dead.add(item.ref);
              }
              call(handler.onRejected, item, error);
            } else {
              if (!isNetworkError(error)) {
                log.error(`Outbox: ${item.kind} failed, will try again`, error);
              }
              break;
            }
          } finally {
            inFlightId = null;
          }
        }
      } finally {
        // Nothing left can refer to an accepted clientId once the queue is
        // empty, so the map starts over rather than growing forever.
        set((s) => ({ syncing: false, idMap: s.items.length === 0 ? {} : s.idMap }));
      }
    };

    // Cleared from outside run(): a flush that ends without awaiting anything
    // (no handler yet) finishes before run() even returns, and clearing it
    // inside would happen before this assignment, leaving it set for good.
    const promise = run();
    flushing = promise;
    const clear = () => {
      if (flushing === promise) {
        flushing = null;
      }
    };
    promise.then(clear, clear);
    return promise;
  },

  // The flush after the connection returns, shown as "Syncing…" until the
  // queue is empty or an item fails (R2.2, R2.3).
  catchUp: async () => {
    if (get().items.length === 0) {
      return;
    }
    set({ catchingUp: true });
    try {
      await get().flush();
    } finally {
      set({ catchingUp: false });
    }
  },

  // Sign-out: the in-memory copy only. The stored one belongs to the
  // account and is written per account (persistSlice drops writes once
  // nobody is signed in), so it's there again if they sign back in.
  clearOutbox: () => set({ items: [], idMap: {}, syncing: false, catchingUp: false }),
}));

// Survives the app being killed (R3.2), per account.
export const hydrateOutbox = persistSlice(useOutboxStore, 'outbox', {
  pick: (s) => ({ items: s.items, idMap: s.idMap }),
  restore: ({ items, idMap }) => ({ items: items || [], idMap: idMap || {} }),
});

export default useOutboxStore;
