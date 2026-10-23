// The comment a one-line preview of a thread shows: its first, unless that
// one is a placeholder ("Comment deleted"), then the first reply under it.
// Null when there's nothing readable.
const previewComment = (thread) => {
  const root = thread?.comments?.[0];
  if (!root) {
    return null;
  }
  if (!root.deleted && !root.hidden) {
    return root;
  }
  return root.replies?.[0] || null;
};

export default previewComment;
