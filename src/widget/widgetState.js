import useReadingProgressStore from '../stores/readingProgressStore';
import useRoomStore from '../stores/roomStore';
import useCommentsStore from '../stores/commentsStore';
import enhancedStorage from '../utils/enhancedStorage';
import { duotoneFor } from '../utils/covers';

// What the home-screen widget shows (WIDGET_5a_5b.md), built from the stores
// the app already keeps. The shape here is decoded by
// ios/ReadPandaWidget/WidgetState.swift — change them together.
//
// Everything the widget says is computed from facts it's handed here; the
// sentences themselves live on the Swift side, where the time of day is known.
// Pages, not chapters: the reader only knows pages.

const TEASER_WORDS = 6;

// The widget decodes strictly (WidgetState.swift): ids are strings, and a NaN
// isn't JSON at all — one would stop the whole state from being written.
const num = (value) => (Number.isFinite(value) ? value : null);
const idOf = (value) => (value == null ? null : String(value));

const pageOf = (pct, totalPages) => Math.round((pct / 100) * totalPages);

const median = (values) => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Room members with a name and their last published percentage. Names come
// from the room store (which knows them); percentages from the pace cache.
const membersWithPace = (room, bookId, remoteProgress) => {
  const pace = remoteProgress?.[bookId] || {};
  return (room?.members || [])
    .filter((m) => !m.isMe && m.userId)
    .map((m) => ({ name: m.name || m.initials || 'Someone', pct: pace[m.userId] ?? m.progressPct ?? 0 }));
};

// The nearest person ahead (5a's "Grace is 12 pages ahead"), or the furthest
// ahead (5b's "you're caught up — Grace is 40 pages ahead").
const friendAhead = (members, myPct, totalPages, pick) => {
  const ahead = members.filter((m) => m.pct > myPct);
  if (ahead.length === 0 || !totalPages) {
    return null;
  }
  const chosen = pick === 'nearest'
    ? ahead.reduce((a, b) => (b.pct < a.pct ? b : a))
    : ahead.reduce((a, b) => (b.pct > a.pct ? b : a));
  const pagesAhead = pageOf(chosen.pct, totalPages) - pageOf(myPct, totalPages);
  return Number.isFinite(pagesAhead) && pagesAhead > 0 ? { name: String(chosen.name), pagesAhead } : null;
};

const teaserText = (body) => {
  const words = (body || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const head = words.slice(0, TEASER_WORDS).join(' ');
  return words.length > TEASER_WORDS ? `${head}…` : head;
};

// The nearest waiting comment. Only comments the server already unlocked are
// in the store at all, so this can't spoil by construction.
const nearestWaiting = (entry, myPage) => {
  const waiting = [];
  (entry?.threads || []).forEach((thread) => {
    (thread.comments || []).forEach((c) => {
      [c, ...(c.replies || [])].forEach((comment) => {
        if (!comment.read && !comment.pending) {
          waiting.push({ ...comment, page: thread.page });
        }
      });
    });
  });
  if (waiting.length === 0) {
    return null;
  }
  const pageIndex = Math.max(0, (myPage || 1) - 1);
  const nearest = waiting.reduce((best, c) => {
    const d = Math.abs(c.page - pageIndex);
    const bestD = Math.abs(best.page - pageIndex);
    return d < bestD || (d === bestD && c.createdAt > best.createdAt) ? c : best;
  });
  const text = teaserText(nearest.body);
  return text ? { author: nearest.username || 'Someone', text } : null;
};

export const buildWidgetState = () => {
  const { activeBook, shelf, remoteProgress } = useReadingProgressStore.getState();
  const rooms = (useRoomStore.getState().rooms || []).filter((r) => !String(r.id).startsWith('fixture-'));
  const commentsByBook = useCommentsStore.getState().byBook || {};
  const shelfById = Object.fromEntries((shelf || []).map((b) => [b.id, b]));

  let currentBook = null;
  if (activeBook?.id) {
    const shelved = shelfById[activeBook.id];
    const totalPages = activeBook.totalChapters || 0;
    const room = rooms.find((r) => r.id === activeBook.roomId);
    currentBook = {
      id: idOf(activeBook.id),
      title: activeBook.title || 'Your book',
      page: num(activeBook.started ? activeBook.chapter : 0) ?? 0,
      totalPages: num(totalPages) ?? 0,
      lastReadAt: num(shelved?.lastReadAt),
      roomId: idOf(activeBook.roomId),
      coverUrl: activeBook.coverUrl || null,
      duotone: duotoneFor(activeBook.title || activeBook.id),
      friendAhead: activeBook.roomId
        ? friendAhead(membersWithPace(room, activeBook.id, remoteProgress), activeBook.progressPct, totalPages, 'nearest')
        : null,
    };
  }

  const widgetRooms = rooms.map((room) => {
    const bookId = room.currentBookId || null;
    const shelved = bookId ? shelfById[bookId] : null;
    const totalPages = shelved?.totalChapters || 0;
    const myPct = shelved?.progressPct || 0;
    const myPage = shelved?.started ? shelved.chapter : null;
    const members = membersWithPace(room, bookId, remoteProgress);

    // The comments store holds one room's conversation per book; only count it
    // when it's this room's.
    const entry = bookId && commentsByBook[bookId]?.roomId === room.id ? commentsByBook[bookId] : null;
    const medianPct = totalPages ? median([myPct, ...members.map((m) => m.pct)]) : null;
    const lastComment = (entry?.threads || [])
      .flatMap((t) => t.comments || [])
      .reduce((latest, c) => Math.max(latest, c.createdAt || 0), 0);

    const initials = (room.members || []).filter((m) => !m.isMe).map((m) => m.initials).filter(Boolean);

    return {
      id: idOf(room.id),
      name: room.name || 'Room',
      bookId: idOf(bookId),
      bookTitle: room.currentBookTitle || null,
      coverUrl: room.coverUrl || null,
      duotone: duotoneFor(room.currentBookTitle || room.name || room.id),
      memberInitials: initials.slice(0, 3),
      unlockedUnreadCount: entry?.unreadCount || 0,
      teaser: entry ? nearestWaiting(entry, myPage) : null,
      myPage: num(myPage),
      // With nobody else's pace known, "the room median" would just be you.
      medianPage: medianPct != null && members.length > 0 ? num(pageOf(medianPct, totalPages)) : null,
      totalPages: num(totalPages) || null,
      lastActivityAt: num(lastComment || (room.updatedAt ? new Date(room.updatedAt).getTime() : null)),
      leader: friendAhead(members, myPct, totalPages, 'furthest'),
    };
  });

  return {
    currentBook,
    streak: enhancedStorage.getReadingStreak(),
    rooms: widgetRooms,
    updatedAt: Date.now(),
  };
};
