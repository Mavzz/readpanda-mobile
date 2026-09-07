import { create } from 'zustand';
import log from '../utils/logger';
import enhanceedStorage from '../utils/enhanceedStorage';
import getInitials from '../utils/getInitials';

// Fixture used by the Home/Reading redesign (1a/1b) until the backend exposes
// room member pace. Matches the shape described in
// design_handoff_redesign/README.md ("State Management").
//
// There is deliberately no fixture *active book*: "no activeBook" is a real
// state the app has to render (FIRST_RUN_3a_3b.md § 3a/3b), so a reader who
// hasn't opened anything yet gets the first-run screens, not a phantom book.
const FIXTURE_MEMBER_PROGRESS = [
  { userId: 'me', initials: 'ME', progressPct: 62, isMe: true },
  { userId: 'priya', initials: 'PR', progressPct: 78 },
  { userId: 'tom', initials: 'TO', progressPct: 91 },
];

// Books reach us in two shapes: the manuscripts list uses `id`, everything
// that came through a bucket or a room uses `book_id`.
const bookIdOf = (book) => book?.book_id ?? book?.id;

// The book a room is reading, in the shape startBook wants. /room/{id} returns
// the whole record; /room/my-rooms only flattens a title and a cover.
const roomBookOf = (room) => {
  if (room?.currentBook?.title) {
    return room.currentBook;
  }
  if (room?.currentBookId && room?.currentBookTitle) {
    return {
      book_id: room.currentBookId,
      title: room.currentBookTitle,
      cover_image_url: room.coverUrl || null,
    };
  }
  return null;
};

// The room's members as the pace track wants them. The API doesn't flag which
// one is me, so match on username the way Room Detail does. my-rooms doesn't
// return members at all yet — rather than claim the room is empty, fall back
// to the one member we can always name: the person holding the phone.
const roomMembersOf = (room) => {
  const me = enhanceedStorage.getUserProfile()?.username || null;
  const members = (room?.members || []).map((m, i) => {
    const name = m.name || m.username || '';
    return {
      userId: m.userId || m.user_id || `member-${i}`,
      initials: m.initials || getInitials(name),
      isMe: !!m.isMe || (!!me && name === me),
    };
  });
  return members.length
    ? members
    : [{ userId: 'me', initials: getInitials(me || 'You'), isMe: true }];
};

// The record persisted alongside the reading position — just enough of the
// book for the Home hero and Reading tab to render it after a cold start.
const toStoredBook = (book, { roomId = null, roomName = null, roomMembers = null, solo = false } = {}) => ({
  book_id: bookIdOf(book),
  title: book?.title,
  cover_image_url: book?.cover_image_url || book?.coverUrl || null,
  manuscript_url: book?.manuscript_url || book?.manuscriptUrl || null,
  // The id, not just the name: it's what lets a deleted or left room find the
  // active book it was attached to (detachRoom).
  room_id: roomId,
  room_name: roomName,
  // Kept so the Reading tab's pace card can name the room's real members
  // after a cold start instead of falling back to the fixture.
  room_members: roomMembers,
  // "Explicitly no room", as opposed to "never had one" — see
  // memberProgressFor. Set when a book outlives the room it was chosen in.
  solo,
});

// Pace for a book being read with a real room. The backend has no per-member
// progress yet, so everyone but me sits at 0 — an honest "nobody has recorded
// progress" rather than the invented pace the fixture shows.
const roomMemberProgress = (members, myProgressPct) => (members || []).map((m) => ({
  userId: m.userId,
  initials: m.initials,
  progressPct: m.isMe ? myProgressPct : 0,
  isMe: !!m.isMe,
}));

// The pace track for a stored book: the room's real members while it has a
// room, an empty track once that room is gone, and the 1b demo fixture only
// for a book that never had a room at all. Without the `solo` check a
// detached book would look like a fixture book and resurrect invented people.
const memberProgressFor = (book, myProgressPct) => {
  if (book?.room_members) {
    return roomMemberProgress(book.room_members, myProgressPct);
  }
  return book?.solo ? [] : FIXTURE_MEMBER_PROGRESS;
};

// What a stored book looks like once its room is gone.
const SOLO_FIELDS = { room_id: null, room_name: null, room_members: null, solo: true };

// Every book the reader has a position for. A room can be behind several of
// them, so attaching and detaching sweep the lot rather than only the book
// currently on the hero.
const storedBooks = () => {
  try {
    return Object.values(enhanceedStorage.getReadingPositions().books || {});
  } catch (e) {
    log.error('Failed to read stored reading positions:', e);
    return [];
  }
};

// The room a stored book belongs to, matched by id where we have one and by
// name for positions written before rooms carried an id here.
const belongsToRoom = (book, roomId, roomName) => (
  book?.room_id && roomId
    ? book.room_id === roomId
    : !!roomName && book?.room_name === roomName
);

// The single shape the Home hero and Reading tab render, built the same way
// whether the book was just chosen in a room or restored from storage.
const toActiveBook = (book, progress = {}) => {
  const currentPage = progress.currentPage || 0;
  const totalPages = progress.totalPages || 0;
  return {
    id: book.book_id,
    title: book.title,
    coverUrl: book.cover_image_url,
    manuscriptUrl: book.manuscript_url,
    // The PDF reader knows pages, not chapters — say so rather than
    // presenting page counts as chapter counts.
    unit: 'page',
    chapter: currentPage + 1,
    totalChapters: totalPages,
    progressPct: totalPages ? Math.round(((currentPage + 1) / totalPages) * 100) : 0,
    // A book chosen in a room but not yet opened has no page count yet — the
    // screens say "Not started yet" rather than "Page 1 of 0".
    started: totalPages > 0,
    roomId: book.room_id || null,
    roomName: book.room_name || null,
    roomMembers: book.room_members || null,
    solo: !!book.solo,
  };
};

// One row of the Reading shelf (4a): the same view model the hero uses, plus
// when it was last touched and the pace track for its room.
const toShelfBook = (entry) => {
  const book = entry.book || {};
  const view = toActiveBook(book, entry.progress);
  return {
    ...view,
    lastReadAt: entry.progress?.lastReadAt || entry.timestamp || 0,
    memberProgress: memberProgressFor(book, view.progressPct),
  };
};

const useReadingProgressStore = create((set, get) => ({
  currentBook: null,
  progress: {},
  recentBooks: [],

  // ── "Tonight" (Home) / Reading tab fixtures ──────────────────────────
  // TODO: replace with real endpoints once member-progress + comment-anchor
  // APIs exist; shapes are already what those endpoints should return.
  activeBook: null,
  memberProgress: [],
  // Every book with a stored position, most recently read first — what the
  // Reading tab renders (4a). The hero is simply shelf[0].
  shelf: [],
  // Distinguishes "nothing read yet" from "haven't looked yet" so Home and
  // the Reading tab don't flash their first-run state before the last-read
  // position has been read back out of storage.
  activeBookLoaded: false,

  // Hydrates the Home hero / Reading tab from the real book the user last
  // opened (persisted with its cover_image_url by saveProgress). Leaves
  // activeBook null when nothing has been read — that's the 3a/3b first run.
  loadActiveBook: () => {
    const { activeBook } = get();
    if (activeBook) {
      set({ activeBookLoaded: true });
      return;
    }

    try {
      const lastRead = enhanceedStorage.getCurrentReadingPosition();
      const book = lastRead?.book;
      if (book?.title) {
        log.info('Restoring last-read book for Home/Reading:', book.title);
        const restored = toActiveBook(book, lastRead.progress);
        set({
          activeBook: restored,
          memberProgress: memberProgressFor(book, restored.progressPct),
          activeBookLoaded: true,
        });
        get().loadShelf();
        return;
      }
    } catch (e) {
      log.error('Failed to restore last-read book:', e);
    }

    log.info('No book read yet — Home/Reading render their first-run state');
    set({ activeBook: null, memberProgress: [], activeBookLoaded: true });
    get().loadShelf();
  },

  // Rebuilt from storage rather than kept in sync by hand: every path that
  // changes a position (a save, a room attach/detach, a book dropped) already
  // writes there, so re-reading is the one way the shelf can't drift.
  loadShelf: () => {
    const shelf = storedBooks()
      .filter((entry) => entry?.book?.title)
      .map(toShelfBook)
      .sort((a, b) => b.lastReadAt - a.lastReadAt);
    set({ shelf });
  },

  setCurrentBook: (book) => {
    log.info('Setting current book:', book?.title);
    set({ currentBook: book });
  },

  // Makes a book the active one before a single page has been read — the
  // bridge from "the room picked this book" (Room Detail) into the reading
  // loop, so the Home hero and Reading tab stop showing their first-run state.
  // Any progress already recorded for the book is carried over, so choosing a
  // book you'd part-read doesn't reset you to page one.
  startBook: (book, { roomId = null, roomName = null, roomMembers = null } = {}) => {
    const id = bookIdOf(book);
    if (!id || !book?.title) {
      log.error('startBook needs a book with an id and a title:', book);
      return null;
    }

    const stored = toStoredBook(book, { roomId, roomName, roomMembers });
    const saved = get().loadProgress(id) || {};
    const progress = {
      currentPage: saved.currentPage || 0,
      totalPages: saved.totalPages || 0,
      lastReadAt: Date.now(),
    };

    log.info('Starting book:', stored.title, roomName ? `(with ${roomName})` : '');
    try {
      // Persisted the same way finishing a reading session is, so the choice
      // survives a cold start.
      enhanceedStorage.saveReadingProgress(id, progress, stored);
    } catch (e) {
      log.error('Failed to persist the chosen book:', e);
    }

    const active = toActiveBook(stored, progress);
    set({
      activeBook: active,
      // A book started in a room shows that room's real members. Only a book
      // with no room behind it falls back to the 1b demo fixture.
      memberProgress: memberProgressFor(stored, active.progressPct),
      activeBookLoaded: true,
    });
    get().loadShelf();
    return stored;
  },

  saveProgress: (manuscriptId, progressData, book = null) => {
    log.info('Saving reading progress for:', manuscriptId);
    try {
      const { activeBook } = get();
      // Keep the room the book was opened from — the reader doesn't know it.
      // `solo` rides along too, so a book whose room was deleted mid-session
      // doesn't get the demo fixture back on the next save.
      const sameBook = activeBook?.id === manuscriptId;
      // Switching to a book that isn't the one on the hero: its room lives in
      // its own stored record, so read it back rather than writing a blank one
      // and quietly stripping the room off a book you'd been reading with
      // people.
      const previous = sameBook ? null : enhanceedStorage.getReadingPosition(manuscriptId)?.book;
      const roomContext = sameBook
        ? {
          roomId: activeBook.roomId,
          roomName: activeBook.roomName,
          roomMembers: activeBook.roomMembers,
          solo: activeBook.solo,
        }
        : {
          roomId: previous?.room_id || null,
          roomName: previous?.room_name || null,
          roomMembers: previous?.room_members || null,
          solo: !!previous?.solo,
        };
      const stored = book ? toStoredBook(book, roomContext) : null;

      // Backing out of the reader before the PDF reports its length gives a
      // totalPages of 0. Don't let that erase a length we already knew and
      // send the hero back to "Not started yet".
      const known = sameBook ? activeBook.totalChapters : 0;
      const progress = progressData.totalPages > 0 || !known
        ? progressData
        : { ...progressData, totalPages: known };

      enhanceedStorage.saveReadingProgress(manuscriptId, progress, stored);
      set((state) => ({
        progress: {
          ...state.progress,
          [manuscriptId]: progress,
        },
        // Push the new position straight into the hero rather than waiting for
        // the next cold read of storage — Home and Reading stay mounted, so
        // without this they'd still show the position from before this session.
        activeBook: stored
          ? toActiveBook(stored, progress)
          : state.activeBook,
        activeBookLoaded: stored ? true : state.activeBookLoaded,
        // My own marker on the pace track moves with my progress — and the
        // track itself follows whichever book just became the hero.
        memberProgress: stored
          ? memberProgressFor(stored, toActiveBook(stored, progress).progressPct)
          : state.memberProgress,
      }));
      get().loadShelf();
    } catch (e) {
      log.error('Failed to save reading progress:', e);
    }
  },

  loadProgress: (manuscriptId) => {
    const { progress } = get();
    if (progress[manuscriptId]) {
      return progress[manuscriptId];
    }
    // Positions are stored per book, so this answers for any book the reader
    // has opened — not just the one they were on last. Before that it only
    // matched the single stored position, which is why coming back to a book
    // you'd put down restarted it at page one.
    try {
      return enhanceedStorage.getReadingPosition(manuscriptId)?.progress || null;
    } catch (e) {
      log.error('Failed to load reading progress:', e);
      return null;
    }
  },

  addToRecentBooks: (book) => {
    const { recentBooks } = get();
    const alreadyExists = recentBooks.some((b) => b.book_id === book.book_id);

    if (!alreadyExists) {
      const updated = [book, ...recentBooks].slice(0, 10);
      set({ recentBooks: updated });
      log.info('Added book to recent list:', book.title);
    }
  },

  // The mirror of detachRoom: a room brings its social layer to a book.
  //
  //   · Already reading the room's book (solo, or attached to nothing) —
  //     re-attach, keeping the page. Without this, reading a book on your own
  //     and then joining the room about it would leave you solo forever.
  //   · Nothing on the nightstand, and `adopt` — take the room's book as the
  //     active one. Joining a room mid-book is an unambiguous signal, and it
  //     costs nothing to be wrong: an unopened room book is cleared by
  //     detachRoom if the room later goes away.
  //   · Reading a different book — left alone. The hero is the reader's
  //     intent, not the room's; Home offers the swap instead of taking it,
  //     and takes it with `force` once the reader accepts.
  attachRoom: (room, { adopt = false, force = false } = {}) => {
    const book = roomBookOf(room);
    if (!room?.id || !book?.title) {
      return;
    }

    const { activeBook } = get();
    const bookId = bookIdOf(book);
    const context = {
      roomId: room.id,
      roomName: room.name,
      roomMembers: roomMembersOf(room),
    };

    if (activeBook && activeBook.id === bookId) {
      // Already wearing this room's colours — nothing to do. (A `solo` book
      // still needs re-attaching, which is why that's part of the check.)
      if (activeBook.roomId === room.id && !activeBook.solo) {
        return;
      }
      log.info('Re-attaching', activeBook.title, 'to', room.name);
      // The room's copy of the book may be missing the manuscript url the
      // reader needs, so keep what the active book already knows.
      get().startBook({
        book_id: bookId,
        title: activeBook.title || book.title,
        cover_image_url: activeBook.coverUrl || book.cover_image_url,
        manuscript_url: activeBook.manuscriptUrl || book.manuscript_url,
      }, context);
      return;
    }

    // Nothing on the nightstand and this is a join → adopt. Reading something
    // else → only when the reader explicitly asked to switch (Home's swap).
    if (force || (!activeBook && adopt)) {
      log.info('Taking', book.title, 'from', room.name);
      get().startBook(book, context);
      return;
    }

    // Tracked, but not the book on the hero: tag it where it sits so it comes
    // back wearing the room's colours when the reader switches to it.
    try {
      enhanceedStorage.updateReadingPositionBook(bookId, {
        room_id: room.id,
        room_name: room.name,
        room_members: context.roomMembers,
        solo: false,
      });
      get().loadShelf();
    } catch (e) {
      log.error('Failed to attach the room to a stored book:', e);
    }
  },

  // A room the active book was being read with has gone away — deleted by its
  // creator, or left. Reading progress is personal (it keys on the book, not
  // the room), so the book itself survives and only the room context around it
  // goes: no "· with <room>" on the heroes, no pace track, no room comments.
  //
  // The exception is a book the room chose that was never opened. That entry
  // existed only because the room picked it, so it goes with the room and Home
  // falls back to its first-run / room-nudge state.
  detachRoom: (roomId, roomName = null) => {
    if (!roomId && !roomName) {
      return;
    }

    // Every book the room was behind, not just the one on the hero. The books
    // you aren't reading right now would otherwise keep a dead room name and
    // its members until you next switched to them.
    storedBooks().forEach((entry) => {
      if (!belongsToRoom(entry?.book, roomId, roomName)) {
        return;
      }
      const started = (entry.progress?.totalPages || 0) > 0;
      try {
        if (started) {
          log.info('Room gone — keeping', entry.book.title, 'as a solo read');
          enhanceedStorage.updateReadingPositionBook(entry.manuscriptId, SOLO_FIELDS);
        } else {
          log.info('Room gone before its book was ever opened — dropping', entry.book.title);
          enhanceedStorage.clearReadingPosition(entry.manuscriptId);
        }
      } catch (e) {
        log.error('Failed to detach the room from a stored book:', e);
      }
    });

    get().loadShelf();

    // Storage is already right; this just mirrors it into what's on screen.
    const { activeBook } = get();
    const activeRecord = activeBook && { room_id: activeBook.roomId, room_name: activeBook.roomName };
    if (!activeBook || !belongsToRoom(activeRecord, roomId, roomName)) {
      return;
    }

    if (!activeBook.started) {
      // The hero may fall through to whatever was read before this book.
      set({ activeBook: null, memberProgress: [], activeBookLoaded: false });
      get().loadActiveBook();
      return;
    }

    set({
      activeBook: {
        ...activeBook, roomId: null, roomName: null, roomMembers: null, solo: true,
      },
      memberProgress: [],
    });
  },

  // Deleting a room isn't the only way a book loses it: the room may have been
  // deleted by its creator on another device, or deleted in a build that
  // didn't detach, leaving a room name stuck in storage forever. So every
  // successful room fetch also checks that every room a tracked book claims is
  // still one the reader is in, and detaches the ones that aren't.
  //
  // Only ever called with a fetch that actually succeeded — a network failure
  // returns no rooms, and must not be read as "your rooms are gone".
  reconcileRooms: (rooms) => {
    // Home can finish fetching rooms before the stored positions have been
    // read back; without this the hero would keep a room the sweep already
    // dropped, until the next fetch.
    get().loadActiveBook();

    const { activeBook } = get();
    // Every room any tracked book claims — including the hero's, which may not
    // have been persisted with an id if it predates that field.
    const claimed = storedBooks()
      .map((entry) => entry?.book)
      .concat(activeBook ? [{ room_id: activeBook.roomId, room_name: activeBook.roomName }] : [])
      .filter((book) => book?.room_id || book?.room_name)
      .map((book) => [book.room_id || null, book.room_name || null]);

    const seen = new Set();
    claimed.forEach(([id, name]) => {
      const key = `${id}::${name}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);

      const stillAMember = (rooms || []).some((r) => (id ? r.id === id : r.name === name));
      if (stillAMember) {
        return;
      }
      log.info('Room is gone from the room list — detaching:', name || id);
      get().detachRoom(id, name);
    });
  },

  clearProgress: () => {
    log.info('Clearing reading progress');
    set({
      currentBook: null,
      progress: {},
      recentBooks: [],
      activeBook: null,
      memberProgress: [],
      shelf: [],
      activeBookLoaded: false,
    });
  },
}));

export default useReadingProgressStore;
