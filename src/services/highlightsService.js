import { getBackendUrl } from '../utils/Helper';
import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from './authenticatedRequests';

// Personal highlights. Unlike comments they key on the reader and the book —
// no room — so the same highlights show up in every room and in solo reading.
// The server only ever returns the caller's own.

// GET /books/{bookId}/highlights — this reader's highlights on one book.
const fetchBookHighlights = async (bookId) => {
  const { status, response } = await makeAuthenticatedGetRequest(
    getBackendUrl(`/books/${encodeURIComponent(bookId)}/highlights`),
  );

  return { status, response };
};

// POST /books/{bookId}/highlights — idempotent on clientId, like comments: the
// API client retries failed POSTs, and a retry gets the first row back.
const createHighlight = async (bookId, highlight) => {
  const { status, response } = await makeAuthenticatedPostRequest(
    getBackendUrl(`/books/${encodeURIComponent(bookId)}/highlights`),
    {
      page: highlight?.page || 0,
      anchor_text: highlight?.anchorText || '',
      anchor_bounds: highlight?.anchorBounds || null,
      file_hash: highlight?.fileHash || '',
      client_id: highlight?.clientId || '',
    },
  );

  return { status, response };
};

// DELETE /highlights/{id} — a 404 means it's already gone, which the store
// treats as done.
const deleteHighlight = async (highlightId) => {
  const { status, response } = await makeAuthenticatedDeleteRequest(
    getBackendUrl(`/highlights/${encodeURIComponent(highlightId)}`),
  );

  return { status, response };
};

export { fetchBookHighlights, createHighlight, deleteHighlight };
