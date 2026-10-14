import enhancedStorage, { localDay } from '../../utils/enhancedStorage';

// The same 1.5 min/page the server uses for bucket reading times, until the
// reader's own pace has enough pages behind it (enhancedStorage).
const DEFAULT_MIN_PER_PAGE = 1.5;

const PARTS = [
  [5, 'morning'],
  [12, 'afternoon'],
  [17, 'evening'],
  [22, 'night'],
];

// "Thursday evening" (16a header).
export const dayAndPart = (now = new Date()) => {
  const hour = now.getHours();
  let part = 'night';
  for (const [from, name] of PARTS) {
    if (hour >= from) {
      part = name;
    }
  }
  return `${now.toLocaleDateString(undefined, { weekday: 'long' })} ${part}`;
};

// "Maya" from "Maya Anand"; a handle stays as is.
export const firstName = (name) => (name || 'Reader').trim().split(/\s+/)[0];

// 1-based chapter for a 1-based page, from the chapter starts the reader read
// out of the PDF's outline. null when the PDF has none.
export const chapterOf = (bookId, page) => {
  const starts = enhancedStorage.getBookChapters(bookId);
  if (!starts || !page) {
    return null;
  }
  const index = starts.filter((start) => start <= page - 1).length;
  return index > 0 ? index : null;
};

// "About 3 h left" / "About 40 min left": the rest of the book at the
// reader's pace. null when the length isn't known yet.
export const timeLeft = (book) => {
  if (!book?.totalChapters) {
    return null;
  }
  const pagesLeft = Math.max(0, book.totalChapters - book.chapter);
  if (pagesLeft === 0) {
    return 'Last page';
  }
  const minutes = pagesLeft * (enhancedStorage.getPaceMinPerPage() || DEFAULT_MIN_PER_PAGE);
  if (minutes < 60) {
    return `About ${Math.max(5, Math.round(minutes / 5) * 5)} min left`;
  }
  return `About ${Math.round(minutes / 60)} h left`;
};

// The last six days and today, oldest first, each read or not (16a).
export const lastSevenDays = (now = new Date()) => {
  const read = new Set(enhancedStorage.getReadingDays());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(day.getDate() - (6 - i));
    const key = localDay(day);
    return {
      key,
      letter: day.toLocaleDateString(undefined, { weekday: 'narrow' }),
      isToday: i === 6,
      read: read.has(key),
    };
  });
};
