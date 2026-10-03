// "~{hrs} hrs" for a bucket (9b, 9c). The server sends reading_minutes at
// 1.5 min/page, and null when any book's length is unknown — in which case
// there's nothing honest to say, so this returns null and the caller drops
// the clause.
const readingHours = (minutes) => {
  if (!minutes) {
    return null;
  }
  const hours = Math.max(1, Math.round(minutes / 60));
  return `~${hours} hr${hours === 1 ? '' : 's'}`;
};

export const booksLabel = (n) => `${n} ${n === 1 ? 'book' : 'books'}`;

// "{n} books · ~{hrs} hrs", or just the count when the time isn't known.
export const bucketMeta = (bookCount, minutes) => {
  const hours = readingHours(minutes);
  return hours ? `${booksLabel(bookCount)} · ${hours}` : booksLabel(bookCount);
};

// A curated tile's meta line (8a, 10e): "{m} of {n} are {Genre}" when a
// genre filter only partly matches the bucket, otherwise "{n} books · ~{hrs} hrs".
export const curatedMeta = (bucket, genre) => (
  genre && bucket.matchingCount != null && bucket.matchingCount < bucket.bookCount
    ? `${bucket.matchingCount} of ${bucket.bookCount} are ${genre}`
    : bucketMeta(bucket.bookCount, bucket.readingMinutes)
);

export default readingHours;
