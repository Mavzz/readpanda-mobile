import useReadingProgressStore from '../stores/readingProgressStore';
import useRoomStore from '../stores/roomStore';
import useCommentsStore from '../stores/commentsStore';
import useBucketsStore from '../stores/bucketsStore';
import enhancedStorage from '../utils/enhancedStorage';
import { duotoneFor } from '../utils/covers';

// What the home-screen and Lock Screen widgets show (WIDGET_5a_5b.md,
// WIDGETS_13a_13f.md), built from the stores the app already keeps. The shape
// here is decoded by ios/ReadPandaWidget/WidgetState.swift — change them
// together.
//
// Everything the widgets say is computed from facts handed over here; the
// sentences themselves live on the Swift side, where the time of day is known.
// Every book's page comes from the one stored position the reader writes, so a
// widget can't show a different page than the app.
//
// Chapters come from the PDF's outline, when it has one (the reader stores
// them on open). Room reading schedules aren't sent by the API yet: `schedule`
// is passed through when a room has one and is null otherwise, and the widgets
// fall back to their no-deadline faces.

const TEASER_WORDS = 6;
const SNIPPET_WORDS = 18;
// Enough for every face (13c shows 3, 13d's Up next 4) without the payload,
// or the covers cached for it, growing with the whole shelf.
const MAX_BOOKS = 10;
const MAX_BUCKET_BOOKS = 6;
const MAX_BUCKETS = 12;

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

const teaserText = (body, limit = TEASER_WORDS) => {
  const words = (body || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const head = words.slice(0, limit).join(' ');
  return words.length > limit ? `${head}…` : head;
};

// Every comment in the room's layer, roots and replies alike. Only unlocked
// comments are ever in the store, so nothing here is ahead of the reader.
const allComments = (entry) => (entry?.threads || []).flatMap((thread) =>
  (thread.comments || []).flatMap((c) => [c, ...(c.replies || [])])
    .filter((c) => !c.pending)
    .map((c) => ({ ...c, page: thread.page })));

// 13d's snippet: the newest comment the reader has unlocked.
const newestSnippet = (entry) => {
  const newest = allComments(entry).reduce((a, b) => (!a || b.createdAt > a.createdAt ? b : a), null);
  const text = newest ? teaserText(newest.body, SNIPPET_WORDS) : '';
  return text ? { author: newest.username || 'Someone', text, page: num(newest.page + 1) } : null;
};

// A room's reading schedule, when it has one: read the target page and due
// date, in either the API's or the app's casing. The API doesn't send one yet.
const scheduleOf = (room) => {
  const raw = room?.schedule;
  if (!raw) {
    return null;
  }
  const targetPage = num(raw.targetPage ?? raw.target_page);
  const due = raw.dueAt ?? raw.due_at;
  const dueAt = num(typeof due === 'string' ? Date.parse(due) : due);
  if (!targetPage || !dueAt) {
    return null;
  }
  return {
    targetPage,
    // Where this stretch of the schedule starts, for 13b's bar.
    startPage: num(raw.startPage ?? raw.start_page) ?? 1,
    dueAt,
  };
};

const bookIdOfPreview = (b) => idOf(b?.book_id ?? b?.bookId ?? b?.id);

// On the last page. Not progressPct >= 100: that's rounded, and would call a
// book finished a few pages before its end.
const isFinished = (book) => !!book?.started && book.chapter >= book.totalChapters;

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
  const { customBuckets = [], curatedBuckets = [] } = useBucketsStore.getState();
  const shelfById = Object.fromEntries((shelf || []).map((b) => [idOf(b.id), b]));

  // Where the reader stands in a book by id, for the bucket covers.
  const stateOf = (bookId) => {
    const shelved = shelfById[bookId];
    if (!shelved?.started) {
      return 'unread';
    }
    return isFinished(shelved) ? 'finished' : 'reading';
  };

  const previewBook = (b) => {
    const id = bookIdOfPreview(b);
    const title = b.title || 'Untitled';
    return {
      id,
      title,
      coverUrl: b.cover_image_url || b.coverUrl || null,
      duotone: duotoneFor(title || id),
      state: stateOf(id),
    };
  };

  // Buckets the widgets can show or be pinned to: a room's reading list (the
  // full list, in its order), then the reader's own (whose list the API
  // previews only the first few of).
  const bucketsById = new Map();
  rooms.forEach((room) => {
    const bucket = room.bucket;
    if (bucket?.id && !bucketsById.has(idOf(bucket.id))) {
      bucketsById.set(idOf(bucket.id), {
        id: idOf(bucket.id),
        name: bucket.name || 'Bucket',
        kind: bucket.type === 'curated' ? 'curated' : 'user',
        books: (bucket.books || []).map(previewBook).filter((b) => b.id),
      });
    }
  });
  customBuckets.forEach((bucket) => {
    if (bucket?.id && !bucketsById.has(idOf(bucket.id))) {
      bucketsById.set(idOf(bucket.id), {
        id: idOf(bucket.id),
        name: bucket.name || 'Bucket',
        kind: 'user',
        books: (bucket.booksPreview || []).map(previewBook).filter((b) => b.id),
      });
    }
  });

  // The bucket a book belongs to: its room's list first, then any of yours.
  const bucketIdFor = (bookId, roomIds) => {
    const viaRoom = rooms.find((r) => roomIds.includes(idOf(r.id)) && r.bucket?.id);
    if (viaRoom) {
      return idOf(viaRoom.bucket.id);
    }
    const mine = [...bucketsById.values()].find((b) => b.books.some((x) => x.id === bookId));
    return mine?.id || null;
  };

  // The rooms reading a book: the one its position was saved with, and any
  // other room of mine whose current book it is.
  const roomIdsFor = (book) => {
    const ids = rooms.filter((r) => idOf(r.currentBookId) === idOf(book.id)).map((r) => idOf(r.id));
    const own = idOf(book.roomId);
    if (own && rooms.some((r) => idOf(r.id) === own) && !ids.includes(own)) {
      ids.unshift(own);
    }
    return ids;
  };

  const toWidgetBook = (book) => {
    const id = idOf(book.id);
    const totalPages = book.totalChapters || 0;
    const roomIds = roomIdsFor(book);
    const room = rooms.find((r) => idOf(r.id) === roomIds[0]);
    return {
      id,
      title: book.title || 'Your book',
      page: num(book.started ? book.chapter : 0) ?? 0,
      totalPages: num(totalPages) ?? 0,
      finished: isFinished(book),
      lastReadAt: num(book.lastReadAt),
      roomId: roomIds[0] || null,
      roomIds,
      bucketId: bucketIdFor(id, roomIds),
      chapters: enhancedStorage.getBookChapters(id),
      coverUrl: book.coverUrl || null,
      duotone: duotoneFor(book.title || id),
      friendAhead: room
        ? friendAhead(membersWithPace(room, book.id, remoteProgress), book.progressPct, totalPages, 'nearest')
        : null,
    };
  };

  // The shelf is most recently read first; the hero leads even before its
  // first save has landed there.
  const ordered = [...(shelf || [])];
  if (activeBook?.id && !ordered.some((b) => idOf(b.id) === idOf(activeBook.id))) {
    ordered.unshift({ ...activeBook, lastReadAt: Date.now() });
  }
  const books = ordered.slice(0, MAX_BOOKS).map(toWidgetBook);

  const finished = (shelf || [])
    .filter(isFinished)
    .reduce((a, b) => (!a || b.lastReadAt > a.lastReadAt ? b : a), null);
  const lastFinished = finished
    ? {
      bookId: idOf(finished.id),
      title: finished.title || 'Your book',
      finishedAt: num(finished.lastReadAt),
      bucketId: bucketIdFor(idOf(finished.id), roomIdsFor(finished)),
    }
    : null;

  const curatedSource = [...curatedBuckets]
    .filter((b) => b.isActive !== false && (b.booksPreview || []).length > 0)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
  const curated = curatedSource
    ? {
      id: idOf(curatedSource.id),
      name: curatedSource.name || 'Curated',
      kind: 'curated',
      books: curatedSource.booksPreview.map(previewBook).filter((b) => b.id && b.state === 'unread')
        .slice(0, MAX_BUCKET_BOOKS),
    }
    : null;

  // Every bucket a face might show first, then the rest for pinning.
  const referenced = new Set([...books.map((b) => b.bucketId), lastFinished?.bucketId].filter(Boolean));
  const buckets = [...bucketsById.values()]
    .sort((a, b) => Number(referenced.has(b.id)) - Number(referenced.has(a.id)))
    .slice(0, MAX_BUCKETS)
    .map((bucket) => (referenced.has(bucket.id)
      ? { ...bucket, books: bucket.books.slice(0, MAX_BUCKET_BOOKS + 1) }
      // Covers only for buckets a face can show; the rest are just names.
      : { ...bucket, books: bucket.books.slice(0, MAX_BUCKET_BOOKS + 1).map((b) => ({ ...b, coverUrl: null })) }));

  const widgetRooms = rooms.map((room) => {
    const bookId = room.currentBookId || null;
    const shelved = bookId ? shelfById[idOf(bookId)] : null;
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
      snippet: entry ? newestSnippet(entry) : null,
      myPage: num(myPage),
      // With nobody else's pace known, "the room median" would just be you.
      medianPage: medianPct != null && members.length > 0 ? num(pageOf(medianPct, totalPages)) : null,
      totalPages: num(totalPages) || null,
      lastActivityAt: num(lastComment || (room.updatedAt ? new Date(room.updatedAt).getTime() : null)),
      leader: friendAhead(members, myPct, totalPages, 'furthest'),
      schedule: scheduleOf(room),
    };
  });

  return {
    books,
    rooms: widgetRooms,
    buckets,
    curated,
    paceMinPerPage: num(enhancedStorage.getPaceMinPerPage()),
    lastFinished,
    streak: enhancedStorage.getReadingStreak(),
    updatedAt: Date.now(),
  };
};
