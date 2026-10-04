import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest } from './authenticatedRequests';

// GET /discover — the Discover tab (8a). No genre is the "For you" feed; a
// genre is a single-select filter over both Curated and Popular.
// Returns { genre, genres: [{ value, label, liked }], curated: [...], popular: [...] }.
const fetchDiscover = async (genre = null) => {
  const query = genre ? `?genre=${encodeURIComponent(genre)}` : '';
  return makeAuthenticatedGetRequest(getBackendUrl(`/discover${query}`));
};

// GET /books/{id} — Book detail (8c): the catalogue record, which of the
// reader's buckets hold it, and which room-mates have read it.
const fetchBookDetail = async (bookId) => (
  makeAuthenticatedGetRequest(getBackendUrl(`/books/${encodeURIComponent(bookId)}`))
);

export { fetchDiscover, fetchBookDetail };
