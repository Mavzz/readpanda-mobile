import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest, makeAuthenticatedPutRequest } from './authenticatedRequests';

// PUT /progress/{bookId} — publish where I am in a book so the rooms I read it
// with can show it. Reading progress keys on the book, not the room, so this
// is sent once however many rooms are reading it.
//
// My own reading never waits on this call: the local position written by
// enhanceedStorage stays what this device renders.
const putReadingProgress = async (bookId, progress) => {
  const { status, response } = await makeAuthenticatedPutRequest(
    getBackendUrl(`/progress/${encodeURIComponent(bookId)}`),
    {
      current_page: progress?.currentPage || 0,
      total_pages: progress?.totalPages || 0,
    },
  );

  return { status, response };
};

// GET /room/{id}/progress — every member's place in whatever the room is
// currently reading, including the members who haven't opened it yet (they
// come back at page 0). Returns book_id so the caller can tell which book the
// numbers describe — the room may have moved on since this device last looked.
const fetchRoomProgress = async (roomId) => {
  const { status, response } = await makeAuthenticatedGetRequest(
    getBackendUrl(`/room/${roomId}/progress`),
  );

  return { status, response };
};

export { putReadingProgress, fetchRoomProgress };
