import { bookIdOf } from '../../utils/bookId';

export { bookIdOf };

export const toPickerBook = (book) => ({
  id: bookIdOf(book),
  title: book?.title || 'Untitled',
  subtitle: book?.author_name || null,
  coverUrl: book?.cover_image_url || null,
});

export const formatJoinDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// "Just created" until the room is a day old, then the date it was made.
export const roomAgeLabel = (createdAt) => {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Just created';
  }
  const hoursOld = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return hoursOld < 24 ? 'Just created' : `Created ${formatJoinDate(createdAt)}`;
};
