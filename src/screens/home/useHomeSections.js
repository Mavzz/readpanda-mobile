import { useMemo } from 'react';
import useReadingProgressStore, { roomMembersOf, roomMemberProgress } from '../../stores/readingProgressStore';
import useRoomStore from '../../stores/roomStore';
import useCommentsStore from '../../stores/commentsStore';
import enhancedStorage from '../../utils/enhancedStorage';
import scheduleOf from '../../utils/roomSchedule';
import { sameId } from '../../utils/bookId';
import { chapterOf, lastSevenDays, timeLeft } from './homeCopy';
import previewComment from '../../utils/commentPreview';

const NEW_COMMENTS = 3;

// The earliest page carrying unread, unlocked comments, 1-based.
const firstWaitingPage = (entry) => {
  const pages = (entry?.threads || []).filter((t) => t.unreadCount > 0).map((t) => t.page);
  return pages.length ? Math.min(...pages) + 1 : null;
};

// Rooms reading `bookId`, the one to name first: nearest deadline, else the
// room the book was last opened in, else the first.
const roomsReading = (rooms, bookId, preferredRoomId) => {
  const reading = rooms.filter((r) => sameId(r.currentBookId, bookId));
  return reading.sort((a, b) => {
    const da = scheduleOf(a)?.dueAt ?? Infinity;
    const db = scheduleOf(b)?.dueAt ?? Infinity;
    if (da !== db) {
      return da - db;
    }
    return Number(b.id === preferredRoomId) - Number(a.id === preferredRoomId);
  });
};

// Every section of Home (turn 16) as a view model, from data the app already
// keeps. A section with nothing to show comes back null and is hidden; the
// layouts never check data themselves.
const useHomeSections = () => {
  const activeBook = useReadingProgressStore((s) => s.activeBook);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const remoteProgress = useReadingProgressStore((s) => s.remoteProgress);
  const rooms = useRoomStore((s) => s.rooms);
  const byBook = useCommentsStore((s) => s.byBook);

  return useMemo(() => {
    // ── Continue (hero) ────────────────────────────────────────────────
    let hero = null;
    if (activeBook) {
      const room = roomsReading(rooms, activeBook.id, activeBook.roomId)[0] || null;
      const members = room
        ? roomMemberProgress(roomMembersOf(room), activeBook.progressPct, remoteProgress?.[activeBook.id])
        : [];
      const ahead = members
        .filter((m) => !m.isMe && m.progressPct > activeBook.progressPct)
        .sort((a, b) => a.progressPct - b.progressPct);
      const entry = byBook[activeBook.id];
      const chapter = activeBook.started ? chapterOf(activeBook.id, activeBook.chapter) : null;
      hero = {
        book: activeBook,
        room,
        members,
        ahead,
        place: activeBook.started
          ? [chapter ? `Ch. ${chapter}` : null, `p. ${activeBook.chapter} of ${activeBook.totalChapters}`]
            .filter(Boolean).join(' · ')
          : 'Not started yet',
        timeLeft: activeBook.started ? timeLeft(activeBook) : null,
        waiting: room ? entry?.unreadCount || 0 : 0,
        waitingAt: room ? firstWaitingPage(entry) : null,
      };
    }

    // ── Your week ──────────────────────────────────────────────────────
    const days = lastSevenDays();
    const everRead = enhancedStorage.getReadingDays().length > 0;
    const yourWeek = everRead
      ? {
        days,
        streak: enhancedStorage.getReadingStreak(),
        pages: enhancedStorage.getPagesRead(7),
        readToday: days[6].read,
      }
      : null;

    // ── Rooms tonight (16e) ────────────────────────────────────────────
    const positionOf = (bookId) => shelf.find((b) => sameId(b.id, bookId));
    const roomsTonight = rooms.map((room) => {
      const schedule = scheduleOf(room);
      const bookId = room.currentBookId;
      const mine = bookId ? positionOf(bookId) : null;
      const members = roomMemberProgress(roomMembersOf(room), mine?.progressPct || 0, remoteProgress?.[bookId]);
      let state = 'noSchedule';
      if (!bookId) {
        state = 'noBook';
      } else if (!mine?.started) {
        state = 'notStarted';
      } else if (schedule) {
        state = 'together';
      }
      return {
        room,
        state,
        schedule,
        bookTitle: room.currentBookTitle,
        unread: bookId ? byBook[bookId]?.unreadCount || 0 : 0,
        members,
        myPct: mine?.progressPct || 0,
        totalPages: mine?.totalChapters || 0,
      };
    }).sort((a, b) => {
      const rank = (r) => {
        if (r.schedule) {
          return 0;
        }
        return r.state === 'noBook' ? 1 : 2;
      };
      return rank(a) - rank(b) || (a.schedule?.dueAt ?? 0) - (b.schedule?.dueAt ?? 0);
    });

    // ── New in your rooms ──────────────────────────────────────────────
    // Only what the server sent: it never sends text for comments past the
    // reader's position, just a count per book.
    const newest = [];
    let locked = 0;
    const seenBooks = new Set();
    rooms.forEach((room) => {
      const bookId = room.currentBookId;
      if (!bookId || seenBooks.has(String(bookId))) {
        return;
      }
      seenBooks.add(String(bookId));
      const entry = byBook[bookId];
      locked += entry?.lockedCount || 0;
      (entry?.threads || []).forEach((thread) => {
        // A placeholder ("Comment deleted") previews its first reply.
        const root = previewComment(thread);
        if (root) {
          newest.push({ thread, root, room, bookId, bookTitle: room.currentBookTitle });
        }
      });
    });
    newest.sort((a, b) => b.root.createdAt - a.root.createdAt);
    const newInRooms = newest.length || locked
      ? { items: newest.slice(0, NEW_COMMENTS), locked }
      : null;

    // ── Up next ────────────────────────────────────────────────────────
    const upNext = shelf
      .filter((b) => !(activeBook && sameId(b.id, activeBook.id)))
      .filter((b) => !b.started || b.progressPct < 100)
      .sort((a, b) => b.lastReadAt - a.lastReadAt);

    return { hero, yourWeek, roomsTonight, newInRooms, upNext };
  }, [activeBook, shelf, remoteProgress, rooms, byBook]);
};

export default useHomeSections;
