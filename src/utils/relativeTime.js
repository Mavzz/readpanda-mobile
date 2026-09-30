// "Page 40 of 210 · 2h ago" — the timestamp half. Deliberately coarse: the
// Reading shelf (4a) only needs to tell "picked this up tonight" apart from
// "left this a fortnight ago", so anything past a week reads as a date.
const relativeTime = (timestamp) => {
  if (!timestamp) {
    return 'not opened yet';
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export default relativeTime;
