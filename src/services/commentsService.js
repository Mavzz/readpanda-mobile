import { getBackendUrl } from '../utils/Helper';
import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from './authenticatedRequests';

// GET /room/{roomId}/book/{bookId}/comments — the comment layer for one book in
// one room. Comments key on the room AND the book: the same book read in two
// rooms is two conversations.
//
// The spoiler rule is applied server-side. Threads that come back are ones this
// reader has reached; everything still ahead of them arrives as `locked_count`
// and nothing else — no ids, no pages, no previews — so there is nothing here
// to read ahead with even if the client wanted to.
const fetchBookComments = async (roomId, bookId) => {
  const { status, response } = await makeAuthenticatedGetRequest(
    getBackendUrl(`/room/${encodeURIComponent(roomId)}/book/${encodeURIComponent(bookId)}/comments`),
  );

  return { status, response };
};

// POST /room/{roomId}/book/{bookId}/comments — write a comment.
//
// `clientId` is minted on the phone before the request leaves it. The API
// client retries failed POSTs, so without it a flaky network would post the
// same comment several times; the server returns the row the first attempt
// wrote instead of adding another.
//
// A reply carries only its parentId and body — the server takes the page,
// anchor and room from the root, so a reply can't be re-anchored somewhere its
// thread isn't.
// `options.quiet`: the store queues a comment that can't be sent rather than
// reporting it (specs/offline-first R3.1).
const createComment = async (roomId, bookId, comment, options = {}) => {
  const { status, response } = await makeAuthenticatedPostRequest(
    getBackendUrl(`/room/${encodeURIComponent(roomId)}/book/${encodeURIComponent(bookId)}/comments`),
    {
      page: comment?.page || 0,
      anchor_text: comment?.anchorText || '',
      anchor_bounds: comment?.anchorBounds || null,
      parent_id: comment?.parentId || '',
      body: comment?.body || '',
      client_id: comment?.clientId || '',
      file_hash: comment?.fileHash || '',
    },
    options,
  );

  return { status, response };
};

// POST /room/{roomId}/book/{bookId}/comments/read — opening a thread marks the
// comments in it read, which is what clears the gutter dot, the scrubber tick
// and both counters on the reader.
const markCommentsRead = async (roomId, bookId, commentIds, options = {}) => {
  const { status, response } = await makeAuthenticatedPostRequest(
    getBackendUrl(`/room/${encodeURIComponent(roomId)}/book/${encodeURIComponent(bookId)}/comments/read`),
    { comment_ids: commentIds || [] },
    options,
  );

  return { status, response };
};

// POST|DELETE /comments/{id}/like — both halves of the heart. Idempotent on
// each side, so a double tap can't double-count. `options.quiet` for the
// outbox, which sends both (specs/offline-first R3.1).
const likeComment = async (commentId, options = {}) => {
  const { status, response } = await makeAuthenticatedPostRequest(
    getBackendUrl(`/comments/${encodeURIComponent(commentId)}/like`),
    {},
    options,
  );

  return { status, response };
};

const unlikeComment = async (commentId, options = {}) => {
  const { status, response } = await makeAuthenticatedDeleteRequest(
    getBackendUrl(`/comments/${encodeURIComponent(commentId)}/like`),
    options,
  );

  return { status, response };
};

export { fetchBookComments, createComment, markCommentsRead, likeComment, unlikeComment };
