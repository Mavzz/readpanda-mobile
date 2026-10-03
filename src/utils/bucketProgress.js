// Where the reader stands in a book on a bucket screen (9a rows, 9b badges).
// This device's shelf wins, since it moves the moment a page turns. The
// server's copy (sent with the bucket) covers books read on another device.
//
// Returns null for a book never opened, else
// { status: 'reading' | 'notStarted' | 'finished', page, pct, lastReadAt, onShelf, roomName }.
const bucketProgress = (book, shelfEntry) => {
  let p = null;
  if (shelfEntry) {
    p = {
      started: shelfEntry.started,
      pct: shelfEntry.progressPct,
      page: shelfEntry.chapter,
      lastReadAt: shelfEntry.lastReadAt || 0,
      onShelf: true,
      roomName: shelfEntry.roomName || null,
    };
  } else if (book.progress) {
    const sp = book.progress;
    p = {
      started: sp.total_pages > 0,
      pct: sp.progress_pct,
      page: sp.current_page + 1,
      lastReadAt: Date.parse(sp.last_read_at) || 0,
      onShelf: false,
      roomName: null,
    };
  }
  if (!p) {
    return null;
  }
  let status = 'notStarted';
  if (p.started) {
    status = p.pct >= 100 ? 'finished' : 'reading';
  }
  return { ...p, status };
};

export default bucketProgress;
