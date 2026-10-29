import { create } from 'zustand';
import log from '../utils/logger';
import getInitials from '../utils/getInitials';
import enhancedStorage from '../utils/enhancedStorage';
import {
  fetchBookComments,
  createComment,
  markCommentsRead,
  likeComment,
  unlikeComment,
} from '../services/commentsService';
import { deleteComment as deleteCommentRequest } from '../services/safetyService';
import { statusOfError, bodyOfError, isNetworkError } from '../utils/apiError';
import useOutboxStore, { registerOutboxHandlers } from './outboxStore';
import persistSlice from './persistSlice';

// Passage-anchored, room-scoped comments (handoff 6a/6b).
//
// Keyed by book, because the same reader can have several books open on the
// shelf and each carries its own conversation — the old flat array couldn't
// say which book a comment belonged to, so Home counted every comment in the
// app against whichever book happened to be the hero.
//
// Everything ahead of the reader arrives as a bare `lockedCount`. The server
// decides that line; there is no client-side filter here to get wrong, and
// nothing in the payload to leak if there were.

// Minted before the request leaves the phone so a retried POST returns the row
// the first attempt wrote instead of adding a second one. No uuid dependency in
// this project, and this only has to be unique per user.
const newClientId = () =>
  `cmt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// A deleted reader's comments stay, moved to this reserved account
// (account-deletion R5.2). Shown by name rather than as its username, so it
// reads as someone who left, not a reader called "deleted.reader" (R5.5).
const DELETED_READER_ID = '00000000-0000-0000-0000-000000000000';

const authorName = (raw) => (
  raw.user_id === DELETED_READER_ID ? 'Deleted reader' : raw.username || ''
);

// The API doesn't flag which comments are mine (the profile has no uuid), so
// match on username the way rooms' isMe does.
const isMineRaw = (raw) => {
  const me = enhancedStorage.getUserProfile()?.username;
  return !!me && !!raw.username && raw.user_id !== DELETED_READER_ID && raw.username === me;
};

const toComment = (raw) => ({
  id: raw.id,
  clientId: raw.client_id || null,
  userId: raw.user_id,
  isMine: isMineRaw(raw),
  // A first comment kept only for its replies (report-block R7.4, R1.4):
  // 'author' | 'moderator' when deleted, 'reported' when this reader
  // reported it. It has no author, body or likes.
  deleted: raw.deleted || null,
  hidden: raw.hidden || null,
  username: authorName(raw),
  initials: getInitials(authorName(raw)),
  page: raw.page || 0,
  body: raw.body || '',
  parentId: raw.parent_id || null,
  likes: raw.likes || 0,
  likedByMe: !!raw.liked_by_me,
  read: !!raw.read,
  createdAt: raw.created_at ? new Date(raw.created_at).getTime() : Date.now(),
  replies: (raw.replies || []).map(toComment),
  pending: false,
  failed: false,
});

const toThread = (raw) => ({
  anchorKey: raw.anchor_key,
  page: raw.page || 0,
  anchorText: raw.anchor_text || '',
  anchorBounds: raw.anchor_bounds || null,
  fileHash: raw.file_hash || '',
  comments: (raw.comments || []).map(toComment),
  unreadCount: raw.unread_count || 0,
});

const emptyEntry = (roomId) => ({
  roomId,
  threads: [],
  lockedCount: 0,
  unreadCount: 0,
  furthestPage: 0,
  loading: false,
  loadedAt: 0,
});

// Roots sort by position in the manuscript, then by when they were written —
// the order the reader meets them going forwards.
const sortThreads = (threads) =>
  [...threads].sort((a, b) => {
    if (a.page !== b.page) {
      return a.page - b.page;
    }
    return (a.comments[0]?.createdAt || 0) - (b.comments[0]?.createdAt || 0);
  });

// Every comment in a thread, roots and replies alike — what "opening a thread
// marks its comments read" has to cover.
const commentIdsIn = (thread) =>
  (thread?.comments || []).flatMap((c) => [c.id, ...(c.replies || []).map((r) => r.id)]);

const countUnread = (threads) =>
  threads.reduce((total, t) => total + t.unreadCount, 0);

const isPlaceholder = (c) => !!(c.deleted || c.hidden);

// After comments are taken out locally: a placeholder with no replies left
// goes (it was only there for them), an empty thread goes, and the unread
// counts follow what's left.
const tidy = (threads) =>
  threads
    .map((t) => {
      const comments = t.comments.filter((c) => !isPlaceholder(c) || c.replies.length > 0);
      const unreadCount = comments.reduce(
        (n, c) => n + (c.read ? 0 : 1) + c.replies.filter((r) => !r.read).length,
        0,
      );
      return { ...t, comments, unreadCount };
    })
    .filter((t) => t.comments.length > 0);

// What a first comment becomes when it has to go but its replies stay.
const asPlaceholder = (c, mark) => ({
  ...c,
  ...mark,
  userId: null,
  username: '',
  initials: '',
  body: '',
  likes: 0,
  likedByMe: false,
  read: true,
  isMine: false,
});

// Take one comment out of a set of threads: a reply goes; a first comment
// with replies becomes a placeholder (mark), one without goes.
const withoutComment = (threads, commentId, mark) =>
  tidy(threads.map((t) => ({
    ...t,
    comments: t.comments.map((c) => {
      if (c.id === commentId) {
        return c.replies.length > 0 ? asPlaceholder(c, mark) : { ...c, gone: true };
      }
      return { ...c, replies: c.replies.filter((r) => r.id !== commentId) };
    }).filter((c) => !c.gone),
  })));

// A refused comment (report-block R8.3): no Retry, since resending can't
// help; the text stays so the reader can change it.
const failureOf = (error) => (
  statusOfError(error) === 400 && bodyOfError(error).code === 'blocked_words' ? 'blocked_words' : true
);

// The server's row in place of the one written on the phone: the comment,
// its thread's anchor key (the server owns it, so a thread the client
// invented adopts the real one) and its replies' parent id.
const withSaved = (state, bookId, clientId, response) => {
  const entry = state.byBook[bookId];
  if (!entry) {
    return state;
  }
  const saved = { ...toComment(response), clientId, pending: false, failed: false, queued: false };
  const threads = entry.threads.map((t) => ({
    ...t,
    anchorKey: t.anchorKey === `pending:${clientId}` ? response.anchor?.key || t.anchorKey : t.anchorKey,
    comments: t.comments.map((c) => (
      c.clientId === clientId && !c.parentId
        ? { ...saved, replies: (c.replies || []).map((r) => ({ ...r, parentId: saved.id })) }
        : { ...c, replies: (c.replies || []).map((r) => (r.clientId === clientId ? saved : r)) }
    )),
  }));
  return { byBook: { ...state.byBook, [bookId]: { ...entry, threads } } };
};

// Set flags on the comment or reply minted with `clientId`.
const withFlags = (state, bookId, clientId, flags) => {
  const entry = state.byBook[bookId];
  if (!entry) {
    return state;
  }
  const mark = (c) => (c.clientId === clientId ? { ...c, ...flags } : c);
  const threads = entry.threads.map((t) => ({
    ...t,
    comments: t.comments.map((c) => ({ ...mark(c), replies: (c.replies || []).map(mark) })),
  }));
  return { byBook: { ...state.byBook, [bookId]: { ...entry, threads } } };
};

// The heart on one comment set to `liked`, its count following.
const withLike = (state, bookId, commentId, liked) => {
  const entry = state.byBook[bookId];
  if (!entry) {
    return state;
  }
  const apply = (c) => (c.id !== commentId || c.likedByMe === liked
    ? c
    : { ...c, likedByMe: liked, likes: Math.max(0, c.likes + (liked ? 1 : -1)) });
  const threads = entry.threads.map((t) => ({
    ...t,
    comments: t.comments.map((c) => ({ ...apply(c), replies: (c.replies || []).map(apply) })),
  }));
  return { byBook: { ...state.byBook, [bookId]: { ...entry, threads } } };
};

// Whether the comment with this id (a clientId, until the server has it) is
// still waiting in the outbox.
const findComment = (entry, commentId) => {
  for (const t of entry?.threads || []) {
    for (const c of t.comments) {
      if (c.id === commentId) {
        return c;
      }
      const reply = (c.replies || []).find((r) => r.id === commentId);
      if (reply) {
        return reply;
      }
    }
  }
  return null;
};
const isQueued = (entry, commentId) => !!findComment(entry, commentId)?.queued;

// Keep a comment that couldn't be sent (specs/offline-first R3.1). It stays
// `pending`, so the sheet treats it as not yet saved, and `queued`, so it
// survives a reload and a restart.
const queueComment = (set, { roomId, bookId, clientId, parentId, page, anchorText, anchorBounds, body, fileHash }) => {
  useOutboxStore.getState().enqueue({
    kind: 'comment.add',
    bookId,
    roomId,
    ref: clientId,
    parentRef: parentId || null,
    payload: { page: page || 0, anchorText: anchorText || '', anchorBounds: anchorBounds || null, body, fileHash: fileHash || '' },
  });
  set((state) => withFlags(state, bookId, clientId, { pending: true, failed: false, queued: true }));
};

// The server's threads, plus what only this phone knows yet (R3.10): its own
// comments still being sent, waiting in the outbox, or refused and waiting
// for Retry, Edit or Discard, which a reload would otherwise wipe (one refused
// in the outbox is followed at once by the reconnect's reload); and minus
// comments it deleted offline, which the server still has until the delete
// gets there.
const withLocal = (threads, previous, deletes) => {
  const isLocal = (c) => c.pending || c.queued || c.failed;
  const known = new Set(threads.flatMap((t) => t.comments.flatMap((c) => [c.clientId, ...c.replies.map((r) => r.clientId)])));
  let merged = threads;

  previous.forEach((t) => t.comments.forEach((c) => {
    if (isLocal(c) && !known.has(c.clientId)) {
      // A new passage keeps its own thread; one on a passage the server
      // already has joins it.
      const target = merged.find((m) => m.anchorText && m.anchorText === t.anchorText && m.page === t.page);
      merged = target
        ? merged.map((m) => (m === target ? { ...m, comments: [...m.comments, c] } : m))
        : [...merged, { ...t, comments: [c], unreadCount: 0 }];
    }
    c.replies.filter((r) => isLocal(r) && !known.has(r.clientId)).forEach((r) => {
      merged = merged.map((m) => ({
        ...m,
        comments: m.comments.map((root) => (
          root.id === r.parentId || root.clientId === r.parentId ? { ...root, replies: [...root.replies, r] } : root
        )),
      }));
    });
  }));

  return deletes.reduce((acc, d) => withoutComment(acc, d.ref, { deleted: 'author' }), merged);
};

const useCommentsStore = create((set, get) => ({
  byBook: {},

  // The comment layer for one book. A failed fetch keeps whatever was last
  // shown rather than emptying the thread the reader is looking at — the same
  // stance readingProgressStore takes on member progress.
  loadComments: async (roomId, bookId) => {
    if (!roomId || !bookId) {
      return;
    }
    const existing = get().byBook[bookId];
    if (existing?.loading) {
      return;
    }

    set((state) => ({
      byBook: {
        ...state.byBook,
        [bookId]: { ...(existing || emptyEntry(roomId)), roomId, loading: true },
      },
    }));

    try {
      const { status, response } = await fetchBookComments(roomId, bookId);
      if (status !== 200 || !response) {
        throw new Error(`Unexpected comments response: ${status}`);
      }

      const threads = sortThreads(withLocal(
        (response.threads || []).map(toThread),
        get().byBook[bookId]?.threads || [],
        useOutboxStore.getState().items.filter((i) => i.kind === 'comment.delete' && i.bookId === bookId),
      ));
      set((state) => ({
        byBook: {
          ...state.byBook,
          [bookId]: {
            roomId,
            threads,
            lockedCount: response.locked_count || 0,
            unreadCount: response.unlocked_unread_count || 0,
            furthestPage: response.furthest_page || 0,
            loading: false,
            loadedAt: Date.now(),
          },
        },
      }));
    } catch (e) {
      log.error(`Failed to load comments for ${bookId}:`, e);
      set((state) => ({
        byBook: {
          ...state.byBook,
          [bookId]: { ...(state.byBook[bookId] || emptyEntry(roomId)), loading: false },
        },
      }));
    }
  },

  // Sweep the shelf. Solo books have no room, so they have no conversation to
  // fetch and are skipped entirely.
  refreshComments: async (books) => {
    const withRooms = (books || []).filter((b) => b?.roomId && b?.id);
    await Promise.all(withRooms.map((b) => get().loadComments(b.roomId, b.id)));
  },

  // Write a comment, or a reply when parentId is set.
  //
  // Local first: the comment is on screen before the request is made, so the
  // composer can close on the reader's tap rather than on the network. A write
  // that fails stays visible and flips to `failed` so it can be retried —
  // silently dropping what someone just typed is the one outcome worth
  // avoiding.
  addComment: async ({ roomId, bookId, page, anchorText, anchorBounds, parentId, body, fileHash }) => {
    if (!roomId || !bookId || !body?.trim()) {
      return null;
    }

    const clientId = newClientId();
    const profile = enhancedStorage.getUserProfile();
    const username = profile?.username || '';
    const anchorKey = parentId ? null : `pending:${clientId}`;

    const optimistic = {
      id: clientId,
      clientId,
      // The profile carries no uuid; the server's row brings the real one.
      userId: null,
      isMine: true,
      deleted: null,
      hidden: null,
      username,
      initials: getInitials(username),
      page: page || 0,
      body: body.trim(),
      parentId: parentId || null,
      likes: 0,
      likedByMe: false,
      read: true,
      createdAt: Date.now(),
      replies: [],
      pending: true,
      failed: false,
    };

    set((state) => {
      const entry = state.byBook[bookId] || emptyEntry(roomId);
      let threads;

      if (parentId) {
        threads = entry.threads.map((t) => ({
          ...t,
          comments: t.comments.map((c) =>
            c.id === parentId ? { ...c, replies: [...c.replies, optimistic] } : c,
          ),
        }));
      } else {
        // A brand new passage gets its own thread; commenting again on one
        // that's already open joins it.
        const target = entry.threads.find(
          (t) => anchorText && t.anchorText === anchorText && t.page === (page || 0),
        );
        threads = target
          ? entry.threads.map((t) =>
            t === target ? { ...t, comments: [...t.comments, optimistic] } : t,
          )
          : [
            ...entry.threads,
            {
              anchorKey,
              page: page || 0,
              anchorText: anchorText || '',
              anchorBounds: anchorBounds || null,
              fileHash: fileHash || '',
              comments: [optimistic],
              unreadCount: 0,
            },
          ];
      }

      return {
        byBook: { ...state.byBook, [bookId]: { ...entry, roomId, threads: sortThreads(threads) } },
      };
    });

    // A reply to a comment still waiting to be sent can't go before it: the
    // server doesn't know the parent yet. It waits behind it (R3.5).
    if (parentId && isQueued(get().byBook[bookId], parentId)) {
      queueComment(set, { roomId, bookId, clientId, parentId, page, anchorText, anchorBounds, body: optimistic.body, fileHash });
      return { ...optimistic, queued: true };
    }

    try {
      const { status, response } = await createComment(roomId, bookId, {
        page,
        anchorText,
        anchorBounds,
        parentId,
        body: body.trim(),
        clientId,
        fileHash,
      }, { quiet: true });
      if (status !== 201 || !response) {
        throw new Error(`Unexpected create-comment response: ${status}`);
      }
      set((state) => withSaved(state, bookId, clientId, response));
      return { ...toComment(response), clientId, pending: false, failed: false };
    } catch (e) {
      // No connection, or no answer: it's kept and sent later, not failed.
      if (isNetworkError(e)) {
        queueComment(set, { roomId, bookId, clientId, parentId, page, anchorText, anchorBounds, body: optimistic.body, fileHash });
        return { ...optimistic, queued: true };
      }
      log.error('Failed to post comment:', e);
      set((state) => withFlags(state, bookId, clientId, { pending: false, failed: failureOf(e) }));
      throw e;
    }
  },

  // Re-send a comment that failed. Safe to call repeatedly: the client id it
  // was minted with makes the server return the original row if one of the
  // earlier attempts actually landed.
  retryComment: async (bookId, clientId) => {
    const entry = get().byBook[bookId];
    if (!entry) {
      return;
    }

    let target = null;
    let thread = null;
    entry.threads.forEach((t) => {
      t.comments.forEach((c) => {
        if (c.clientId === clientId) {
          target = c;
          thread = t;
        }
        c.replies.forEach((r) => {
          if (r.clientId === clientId) {
            target = r;
            thread = t;
          }
        });
      });
    });
    if (!target) {
      return;
    }

    set((state) => withFlags(state, bookId, clientId, { pending: true, failed: false }));

    const comment = {
      roomId: entry.roomId,
      bookId,
      clientId,
      parentId: target.parentId,
      page: target.page,
      anchorText: thread?.anchorText,
      anchorBounds: thread?.anchorBounds,
      body: target.body,
      fileHash: thread?.fileHash,
    };
    try {
      const { status, response } = await createComment(entry.roomId, bookId, comment, { quiet: true });
      if (status !== 201 || !response) {
        throw new Error(`Unexpected create-comment response: ${status}`);
      }
      set((state) => withSaved(state, bookId, clientId, response));
    } catch (e) {
      if (isNetworkError(e)) {
        queueComment(set, comment);
        return;
      }
      log.error('Failed to retry comment:', e);
      set((state) => withFlags(state, bookId, clientId, { pending: false, failed: failureOf(e) }));
    }
  },

  // The heart. Flips locally first so the tap registers instantly, and rolls
  // back if the write is refused.
  //
  // Every like goes through the outbox, online or not: it keeps them in
  // order and only the last per comment, so a like queued offline can't be
  // sent after an unlike made once back online (specs/offline-first R3.4).
  toggleLike: async (bookId, commentId) => {
    const entry = get().byBook[bookId];
    const comment = findComment(entry, commentId);
    // Not saved yet: there's nothing on the server to like.
    if (!comment || comment.pending) {
      return;
    }
    const liked = !comment.likedByMe;
    // What the server has, for putting it back if the like is refused: the
    // state before the first change still waiting to be sent.
    const waiting = useOutboxStore.getState().items.find((i) => i.kind === 'comment.like' && i.ref === commentId);
    const before = waiting ? waiting.payload.before : comment.likedByMe;

    set((state) => withLike(state, bookId, commentId, liked));
    const outbox = useOutboxStore.getState();
    outbox.enqueue({ kind: 'comment.like', bookId, roomId: entry.roomId, ref: commentId, payload: { liked, before } });
    await outbox.flush();
  },

  // Opening a thread clears its dots, its scrubber tick and its share of both
  // counters. Applied locally first — the reader has demonstrably seen them.
  // The receipt goes through the outbox, merged per book (R3.4).
  markThreadRead: async (bookId, anchorKey) => {
    const entry = get().byBook[bookId];
    const thread = entry?.threads.find((t) => t.anchorKey === anchorKey);
    if (!entry || !thread || thread.unreadCount === 0) {
      return;
    }

    const ids = commentIdsIn(thread).filter((id) => !String(id).startsWith('cmt_'));

    set((state) => {
      const current = state.byBook[bookId];
      const read = (c) => ({ ...c, read: true, replies: (c.replies || []).map((r) => ({ ...r, read: true })) });
      const threads = current.threads.map((t) =>
        t.anchorKey === anchorKey ? { ...t, comments: t.comments.map(read), unreadCount: 0 } : t,
      );
      return {
        byBook: {
          ...state.byBook,
          [bookId]: { ...current, threads, unreadCount: countUnread(threads) },
        },
      };
    });

    if (ids.length === 0) {
      return;
    }
    const outbox = useOutboxStore.getState();
    outbox.enqueue({ kind: 'comment.read', bookId, roomId: entry.roomId, payload: { commentIds: ids } });
    await outbox.flush();
  },

  // Take a refused comment out so its text can go back in the composer
  // (report-block R8.3). It was never saved, so there's nothing to delete.
  discardFailed: (bookId, clientId) => {
    set((state) => {
      const entry = state.byBook[bookId];
      if (!entry) {
        return state;
      }
      const keep = (c) => c.clientId !== clientId;
      const threads = tidy(entry.threads.map((t) => ({
        ...t,
        comments: t.comments.filter(keep).map((c) => ({ ...c, replies: c.replies.filter(keep) })),
      })));
      return { byBook: { ...state.byBook, [bookId]: { ...entry, threads, unreadCount: countUnread(threads) } } };
    });
  },

  // Delete one of your own comments (report-block R7.3, R7.5). Gone or down
  // to "Comment deleted" at once, and put back if the API says no. Returns
  // { ok }.
  deleteComment: async (bookId, commentId) => {
    const before = get().byBook[bookId];
    if (!before) {
      return { ok: false };
    }

    // Never sent: it goes, with anything written under it, and the outbox
    // drops it rather than sending a post and then a delete (R3.4).
    const queued = findComment(before, commentId);
    if (queued?.queued) {
      useOutboxStore.getState().enqueue({
        kind: 'comment.delete', bookId, roomId: before.roomId, ref: queued.clientId,
      });
      set((state) => {
        const entry = state.byBook[bookId];
        const keep = (c) => c.clientId !== queued.clientId;
        const threads = tidy(entry.threads.map((t) => ({
          ...t,
          comments: t.comments.filter(keep).map((c) => ({ ...c, replies: c.replies.filter(keep) })),
        })));
        return { byBook: { ...state.byBook, [bookId]: { ...entry, threads, unreadCount: countUnread(threads) } } };
      });
      return { ok: true };
    }
    const restore = () => set((state) => ({
      byBook: { ...state.byBook, [bookId]: { ...(state.byBook[bookId] || before), threads: before.threads, unreadCount: before.unreadCount } },
    }));

    set((state) => {
      const entry = state.byBook[bookId];
      const threads = withoutComment(entry.threads, commentId, { deleted: 'author' });
      return { byBook: { ...state.byBook, [bookId]: { ...entry, threads, unreadCount: countUnread(threads) } } };
    });

    try {
      const { status } = await deleteCommentRequest(commentId, { quiet: true });
      // 404: already gone, which is what was asked for.
      if (status === 204 || status === 200 || status === 404) {
        return { ok: true };
      }
      restore();
      return { ok: false };
    } catch (e) {
      // No connection: it stays deleted here and the outbox sends it.
      if (isNetworkError(e)) {
        useOutboxStore.getState().enqueue({ kind: 'comment.delete', bookId, roomId: before.roomId, ref: commentId });
        return { ok: true };
      }
      log.error('Failed to delete comment:', e);
      restore();
      return { ok: false };
    }
  },

  // A comment this reader just reported leaves their view at once (R1.4):
  // a reply goes, a first comment with replies becomes "You reported this
  // comment". The next fetch says the same.
  hideReported: (bookId, commentId) => {
    set((state) => {
      const entry = state.byBook[bookId];
      if (!entry) {
        return state;
      }
      const threads = withoutComment(entry.threads, commentId, { hidden: 'reported' });
      return { byBook: { ...state.byBook, [bookId]: { ...entry, threads, unreadCount: countUnread(threads) } } };
    });
  },

  // Someone was just blocked (R5.2): their threads, with every reply, and
  // their replies elsewhere leave every loaded book at once.
  dropAuthor: (userId) => {
    if (!userId) {
      return;
    }
    set((state) => {
      const byBook = {};
      Object.entries(state.byBook).forEach(([bookId, entry]) => {
        const threads = tidy(entry.threads.map((t) => ({
          ...t,
          comments: t.comments
            .filter((c) => c.userId !== userId)
            .map((c) => ({ ...c, replies: c.replies.filter((r) => r.userId !== userId) })),
        })));
        byBook[bookId] = { ...entry, threads, unreadCount: countUnread(threads) };
      });
      return { byBook };
    });
  },

  // Threads anchored to one page — what the reader draws in the gutter.
  threadsForPage: (bookId, page) =>
    (get().byBook[bookId]?.threads || []).filter((t) => t.page === page),

  unlockedUnreadCount: (bookId) => get().byBook[bookId]?.unreadCount || 0,

  lockedCount: (bookId) => get().byBook[bookId]?.lockedCount || 0,

  // Pages carrying at least one unlocked thread — the scrubber's tick marks.
  commentPages: (bookId) => {
    const threads = get().byBook[bookId]?.threads || [];
    return [...new Set(threads.map((t) => t.page))].sort((a, b) => a - b);
  },

  clearComments: () => {
    set({ byBook: {} });
  },
}));

// Sending what the outbox kept (specs/offline-first R3).
registerOutboxHandlers('comment.add', {
  send: (item) => createComment(item.roomId, item.bookId, {
    ...item.payload,
    parentId: item.parentRef,
    clientId: item.ref,
  }, { quiet: true }),
  onAccepted: (item, result) => {
    if (result?.response) {
      useCommentsStore.setState((state) => withSaved(state, item.bookId, item.ref, result.response));
    }
  },
  // Refused, or its parent was: it flips to failed, with Retry or (for its
  // words) Edit, as a comment refused online does (R3.6).
  onRejected: (item, error) => {
    useCommentsStore.setState((state) => withFlags(state, item.bookId, item.ref, {
      pending: false, queued: false, failed: failureOf(error),
    }));
  },
});

registerOutboxHandlers('comment.delete', {
  // deleteCommentRequest answers a 4xx rather than throwing it; the outbox
  // needs the throw to tell a refusal (or a 404, done) from a success.
  send: async (item) => {
    const result = await deleteCommentRequest(item.ref, { quiet: true });
    if (result.status >= 400) {
      throw new Error(`Client error ${result.status}: {}`);
    }
    return result;
  },
  // Not ours to delete after all (403): the server's copy is the truth.
  onRejected: (item) => {
    if (item.roomId) {
      useCommentsStore.getState().loadComments(item.roomId, item.bookId);
    }
  },
});

registerOutboxHandlers('comment.like', {
  send: (item) => (item.payload.liked
    ? likeComment(item.ref, { quiet: true })
    : unlikeComment(item.ref, { quiet: true })),
  // Refused (a deleted comment, say): back to what the server has (R3.6).
  onRejected: (item) => {
    useCommentsStore.setState((state) => withLike(state, item.bookId, item.ref, item.payload.before));
  },
});

registerOutboxHandlers('comment.read', {
  send: (item) => markCommentsRead(item.roomId, item.bookId, item.payload.commentIds, { quiet: true }),
  // Refused: the server's idea of what's unread wins, so ask it again (R3.6).
  onRejected: (item) => {
    if (item.roomId) {
      useCommentsStore.getState().loadComments(item.roomId, item.bookId);
    }
  },
});

// How many books' comments are kept on the device (R4.2).
const KEEP_BOOKS = 30;

// The books loaded most recently, plus any with a comment still to send,
// which can't be dropped.
const keptBooks = (byBook) => {
  const hasLocal = (entry) => entry.threads.some((t) => t.comments.some(
    (c) => c.queued || c.replies.some((r) => r.queued),
  ));
  const recent = Object.entries(byBook)
    .sort(([, a], [, b]) => (b.loadedAt || 0) - (a.loadedAt || 0))
    .slice(0, KEEP_BOOKS)
    .map(([id]) => id);
  return Object.fromEntries(Object.entries(byBook)
    .filter(([id, entry]) => recent.includes(id) || hasLocal(entry))
    .map(([id, entry]) => [id, { ...entry, loading: false }]));
};

// A comment that was mid-request when the app was killed may never have
// landed: it comes back failed, with Retry, rather than spinning forever or
// losing what was typed. Retrying can't post it twice (client_id).
const unstick = (c) => (c.pending && !c.queued ? { ...c, pending: false, failed: true } : c);

// The comment layer from last time, offline too (R4.1).
export const hydrateComments = persistSlice(useCommentsStore, 'comments', {
  pick: (s) => ({ byBook: keptBooks(s.byBook) }),
  restore: ({ byBook }) => ({
    byBook: Object.fromEntries(Object.entries(byBook || {}).map(([id, entry]) => [id, {
      ...entry,
      threads: entry.threads.map((t) => ({
        ...t,
        comments: t.comments.map((c) => ({ ...unstick(c), replies: c.replies.map(unstick) })),
      })),
    }])),
  }),
});

export default useCommentsStore;
