import { getBackendUrl } from '../utils/Helper';
import { statusOfError, bodyOfError } from '../utils/apiError';
import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPostRequest,
  makeAuthenticatedDeleteRequest,
} from './authenticatedRequests';

// Reporting, blocking and deleting your own comment (specs/report-block).
//
// Each one is a tap the reader is waiting on, so none of them retries: a
// failure shows at once. A refusal (4xx) comes back as { status, error, code }
// rather than a throw, since apiService throws on those; a network failure
// still throws.
const NOW = { maxRetries: 0 };

const settle = async (request) => {
  try {
    return await request();
  } catch (error) {
    const status = statusOfError(error);
    if (!status) {
      throw error;
    }
    const body = bodyOfError(error);
    return { status, error: body.error || null, code: body.code || null };
  }
};

// POST /reports — { targetType: 'comment' | 'user' | 'room', targetId,
// roomId?, reason, details? }. 201 new, 200 already reported, 429 too many.
const reportContent = ({ targetType, targetId, roomId, reason, details }) =>
  settle(() => makeAuthenticatedPostRequest(
    getBackendUrl('/reports'),
    {
      target_type: targetType,
      target_id: targetId,
      room_id: roomId || '',
      reason,
      details: details || '',
    },
    NOW,
  ));

// POST /users/me/blocks — 204, also when already blocked.
const blockUser = (userId) =>
  settle(() => makeAuthenticatedPostRequest(getBackendUrl('/users/me/blocks'), { user_id: userId }, NOW));

// DELETE /users/me/blocks/{userId} — 204.
const unblockUser = (userId) =>
  settle(() => makeAuthenticatedDeleteRequest(
    getBackendUrl(`/users/me/blocks/${encodeURIComponent(userId)}`),
    NOW,
  ));

// GET /users/me/blocks — [{ user_id, username, blocked_at }], newest first.
const fetchBlocks = () =>
  settle(() => makeAuthenticatedGetRequest(getBackendUrl('/users/me/blocks')));

// DELETE /comments/{id} — your own. 204; 403 not yours; 404 already gone.
const deleteComment = (commentId) =>
  settle(() => makeAuthenticatedDeleteRequest(
    getBackendUrl(`/comments/${encodeURIComponent(commentId)}`),
    NOW,
  ));

export { reportContent, blockUser, unblockUser, fetchBlocks, deleteComment };
