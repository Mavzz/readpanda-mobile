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
import { statusOfError, bodyOfError } from '../utils/apiError';

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

      const threads = sortThreads((response.threads || []).map(toThread));
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

    try {
      const { status, response } = await createComment(roomId, bookId, {
        page,
        anchorText,
        anchorBounds,
        parentId,
        body: body.trim(),
        clientId,
        fileHash,
      });
      if (status !== 201 || !response) {
        throw new Error(`Unexpected create-comment response: ${status}`);
      }

      const saved = { ...toComment(response), clientId, pending: false, failed: false };
      set((state) => {
        const entry = state.byBook[bookId];
        if (!entry) {
          return state;
        }
        const threads = entry.threads.map((t) => ({
          ...t,
          // The server owns the anchor key, so a thread the client invented
          // for an optimistic row adopts the real one on the way back.
          anchorKey: t.anchorKey === anchorKey ? response.anchor?.key || t.anchorKey : t.anchorKey,
          comments: t.comments.map((c) =>
            c.clientId === clientId && !c.parentId
              ? { ...saved, replies: c.replies }
              : { ...c, replies: c.replies.map((r) => (r.clientId === clientId ? saved : r)) },
          ),
        }));
        return { byBook: { ...state.byBook, [bookId]: { ...entry, threads } } };
      });
      return saved;
    } catch (e) {
      log.error('Failed to post comment:', e);
      const failed = failureOf(e);
      set((state) => {
        const entry = state.byBook[bookId];
        if (!entry) {
          return state;
        }
        const flag = (c) =>
          c.clientId === clientId ? { ...c, pending: false, failed } : c;
        const threads = entry.threads.map((t) => ({
          ...t,
          comments: t.comments.map((c) => ({ ...flag(c), replies: c.replies.map(flag) })),
        }));
        return { byBook: { ...state.byBook, [bookId]: { ...entry, threads } } };
      });
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

    set((state) => {
      const current = state.byBook[bookId];
      const mark = (c) => (c.clientId === clientId ? { ...c, pending: true, failed: false } : c);
      const threads = current.threads.map((t) => ({
        ...t,
        comments: t.comments.map((c) => ({ ...mark(c), replies: c.replies.map(mark) })),
      }));
      return { byBook: { ...state.byBook, [bookId]: { ...current, threads } } };
    });

    try {
      const { status, response } = await createComment(entry.roomId, bookId, {
        page: target.page,
        anchorText: thread?.anchorText,
        anchorBounds: thread?.anchorBounds,
        parentId: target.parentId,
        body: target.body,
        clientId,
        fileHash: thread?.fileHash,
      });
      if (status !== 201 || !response) {
        throw new Error(`Unexpected create-comment response: ${status}`);
      }
      const saved = { ...toComment(response), clientId, pending: false, failed: false };
      set((state) => {
        const current = state.byBook[bookId];
        const swap = (c) => (c.clientId === clientId ? { ...saved, replies: c.replies || [] } : c);
        const threads = current.threads.map((t) => ({
          ...t,
          comments: t.comments.map((c) => ({ ...swap(c), replies: (c.replies || []).map(swap) })),
        }));
        return { byBook: { ...state.byBook, [bookId]: { ...current, threads } } };
      });
    } catch (e) {
      log.error('Failed to retry comment:', e);
      const failed = failureOf(e);
      set((state) => {
        const current = state.byBook[bookId];
        const mark = (c) => (c.clientId === clientId ? { ...c, pending: false, failed } : c);
        const threads = current.threads.map((t) => ({
          ...t,
          comments: t.comments.map((c) => ({ ...mark(c), replies: c.replies.map(mark) })),
        }));
        return { byBook: { ...state.byBook, [bookId]: { ...current, threads } } };
      });
    }
  },

  // The heart. Flips locally first so the tap registers instantly, and rolls
  // back if the write is refused.
  toggleLike: async (bookId, commentId) => {
    const entry = get().byBook[bookId];
    if (!entry) {
      return;
    }

    let wasLiked = false;
    const apply = (liked) => (c) => {
      if (c.id !== commentId) {
        return c;
      }
      return { ...c, likedByMe: liked, likes: Math.max(0, c.likes + (liked ? 1 : -1)) };
    };

    entry.threads.forEach((t) =>
      t.comments.forEach((c) => {
        if (c.id === commentId) {
          wasLiked = c.likedByMe;
        }
        c.replies.forEach((r) => {
          if (r.id === commentId) {
            wasLiked = r.likedByMe;
          }
        });
      }),
    );

    const write = (liked) =>
      set((state) => {
        const current = state.byBook[bookId];
        if (!current) {
          return state;
        }
        const fn = apply(liked);
        const threads = current.threads.map((t) => ({
          ...t,
          comments: t.comments.map((c) => ({ ...fn(c), replies: c.replies.map(fn) })),
        }));
        return { byBook: { ...state.byBook, [bookId]: { ...current, threads } } };
      });

    write(!wasLiked);
    try {
      const { status } = wasLiked ? await unlikeComment(commentId) : await likeComment(commentId);
      if (status !== 204 && status !== 200) {
        throw new Error(`Unexpected like response: ${status}`);
      }
    } catch (e) {
      log.error('Failed to update like:', e);
      write(wasLiked);
    }
  },

  // Opening a thread clears its dots, its scrubber tick and its share of both
  // counters. Applied locally first — the reader has demonstrably seen them.
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
    try {
      await markCommentsRead(entry.roomId, bookId, ids);
    } catch (e) {
      // The dots are already cleared locally. Losing the receipt costs a
      // reappearing dot on the next fetch, not correctness.
      log.error('Failed to mark comments read:', e);
    }
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
    const restore = () => set((state) => ({
      byBook: { ...state.byBook, [bookId]: { ...(state.byBook[bookId] || before), threads: before.threads, unreadCount: before.unreadCount } },
    }));

    set((state) => {
      const entry = state.byBook[bookId];
      const threads = withoutComment(entry.threads, commentId, { deleted: 'author' });
      return { byBook: { ...state.byBook, [bookId]: { ...entry, threads, unreadCount: countUnread(threads) } } };
    });

    try {
      const { status } = await deleteCommentRequest(commentId);
      // 404: already gone, which is what was asked for.
      if (status === 204 || status === 200 || status === 404) {
        return { ok: true };
      }
      restore();
      return { ok: false };
    } catch (e) {
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

export default useCommentsStore;
