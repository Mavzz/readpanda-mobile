import { create } from 'zustand';
import log from '../utils/logger';

// Fixture comments for the Reading tab (1b) — matches
// design_handoff_redesign/README.md's commentsStore shape:
//   comments: [{id, userId, anchor: {chapter, page}, quote, body}]
// TODO: replace with a real endpoint once comment anchors exist server-side.
const FIXTURE_COMMENTS = [
  {
    id: 'c1',
    userId: 'priya',
    userInitials: 'PR',
    userName: 'Priya',
    anchor: { chapter: 6, page: 148 },
    quote: 'Never underestimate the big importance of small things.',
    body: 'This line wrecked me. Maya you\'re going to love this chapter 🥲',
  },
];

// Locked comments only need to be counted, not shown — so the fixture
// intentionally has no body/quote, just an anchor.
const FIXTURE_LOCKED_COMMENTS = [
  { id: 'c2', anchor: { chapter: 9 } },
  { id: 'c3', anchor: { chapter: 9 } },
];

const useCommentsStore = create((set, get) => ({
  comments: [],
  lockedComments: [],

  loadFixtureComments: () => {
    const { comments } = get();
    if (comments.length > 0) {
      return;
    }
    log.info('Loading fixture comments for Reading tab redesign');
    set({ comments: FIXTURE_COMMENTS, lockedComments: FIXTURE_LOCKED_COMMENTS });
  },

  // Comments whose anchor chapter is at or before the reader's current chapter.
  unlockedComments: (myChapter) => {
    return get().comments.filter((c) => c.anchor.chapter <= myChapter);
  },

  // { count, chapter } of the next locked batch waiting ahead of myChapter.
  nextLockedBatch: (myChapter) => {
    const locked = get().lockedComments.filter((c) => c.anchor.chapter > myChapter);
    if (locked.length === 0) {
      return null;
    }
    const chapter = Math.min(...locked.map((c) => c.anchor.chapter));
    return { count: locked.filter((c) => c.anchor.chapter === chapter).length, chapter };
  },

  clearComments: () => {
    set({ comments: [], lockedComments: [] });
  },
}));

export default useCommentsStore;
