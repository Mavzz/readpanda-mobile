// Books reach the app in two shapes — the manuscripts list uses `id`, the
// rest of the API `book_id` — and ids arrive as numbers from some endpoints
// and strings from others (and from storage). Compare them through these,
// never with a bare ===.

export const bookIdOf = (book) => book?.book_id ?? book?.id;

// Same id, whatever type each side came as. Two missing ids are not a match.
export const sameId = (a, b) => a != null && b != null && String(a) === String(b);
