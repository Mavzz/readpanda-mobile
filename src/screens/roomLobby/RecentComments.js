import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import useCommentsStore from '../../stores/commentsStore';
import CommentThreadSheet from '../../components/CommentThreadSheet';
import relativeTime from '../../utils/relativeTime';

// "Recent · unlocked for you" (2c / 14i): the newest comments up to the
// reader's position, and everything beyond it as a count only — the server
// never sends text for those. A tap opens the thread. `book` is from
// useActiveRoomBook; the caller loads the comments.
const RecentComments = ({ book, limit = 3 }) => {
  // Subscribing to byBook, not only to the actions: action identities are
  // stable, so reading them alone would leave this section frozen when the
  // comments actually arrive.
  const commentsByBook = useCommentsStore((s) => s.byBook);
  const toggleLike = useCommentsStore((s) => s.toggleLike);
  const markThreadRead = useCommentsStore((s) => s.markThreadRead);
  const retryComment = useCommentsStore((s) => s.retryComment);
  const addComment = useCommentsStore((s) => s.addComment);

  const [openThreadKey, setOpenThreadKey] = useState(null);

  const commentEntry = commentsByBook[book.id];
  const threads = commentEntry?.threads || [];
  const lockedCount = commentEntry?.lockedCount || 0;
  const openThread = threads.find((t) => t.anchorKey === openThreadKey) || null;
  const recent = threads
    .filter((t) => t.comments[0])
    .sort((a, b) => b.comments[0].createdAt - a.comments[0].createdAt)
    .slice(0, limit);

  if (recent.length === 0 && lockedCount === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Recent · unlocked for you</Text>

      {recent.map((thread) => {
        const root = thread.comments[0];
        return (
          <Pressable
            key={thread.anchorKey}
            onPress={() => {
              setOpenThreadKey(thread.anchorKey);
              markThreadRead(book.id, thread.anchorKey);
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${root.username}, page ${root.page + 1}: ${root.body}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{root.initials}</Text>
            </View>
            <View style={styles.rowText}>
              <View style={styles.rowMeta}>
                <Text style={styles.name} numberOfLines={1}>{root.username}</Text>
                <Text style={styles.when}>p. {root.page + 1} · {relativeTime(root.createdAt)}</Text>
                {thread.unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.body} numberOfLines={2}>{root.body}</Text>
            </View>
          </Pressable>
        );
      })}

      {lockedCount > 0 ? (
        <View style={styles.locked}>
          <Icon name="lock-closed-outline" size={15} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.lockedText}>
            {lockedCount} more unlock{lockedCount === 1 ? 's' : ''} as you read
          </Text>
        </View>
      ) : null}

      <CommentThreadSheet
        visible={!!openThread}
        thread={openThread}
        roomName={book.roomName}
        submitting={false}
        onSubmit={({ body, parentId }) =>
          addComment({
            roomId: book.roomId,
            bookId: book.id,
            page: openThread?.page,
            anchorText: openThread?.anchorText,
            anchorBounds: openThread?.anchorBounds,
            parentId,
            body,
            fileHash: openThread?.fileHash,
          }).catch(() => {})
        }
        onLike={(c) => toggleLike(book.id, c.id)}
        onRetry={(c) => retryComment(book.id, c.clientId)}
        onClose={() => setOpenThreadKey(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 14,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.surfaceContainer,
  },
  eyebrow: {
    ...DS.type.eyebrow,
    color: DS.colors.onSurfaceVariant,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 12.5,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  when: {
    fontSize: 10.5,
    fontFamily: DS.font.semibold,
    color: DS.colors.placeholder,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.colors.primary,
  },
  body: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.body,
    lineHeight: 19.5,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockedText: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
});

export default RecentComments;
