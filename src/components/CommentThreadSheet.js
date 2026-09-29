import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';
import relativeTime from '../utils/relativeTime';

// The thread sheet (6b). One passage, everything said about it, and a way to
// add to it — opened from a gutter dot, from the chrome icon (page-level, no
// quote), or straight from a fresh selection.
//
// Replies are one level deep on purpose: a conversation about a sentence stays
// legible, and the reader never has to track where in a tree they are.
const VISIBLE_REPLIES = 2;

const Avatar = ({ initials, size }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size === 30 ? 11 : 10 }]}>{initials}</Text>
  </View>
);

const CommentRow = ({ comment, isReply, onLike, onReply }) => (
  <View style={[styles.commentRow, isReply && styles.replyRow]}>
    <Avatar initials={comment.initials} size={isReply ? 26 : 30} />
    <View style={styles.commentBody}>
      <View style={styles.commentMeta}>
        <Text style={styles.commentName} numberOfLines={1}>{comment.username}</Text>
        <Text style={styles.commentStamp}>
          p. {comment.page + 1} · {relativeTime(comment.createdAt)}
        </Text>
        {!comment.read && <View style={styles.unreadDot} />}
      </View>

      <Text style={styles.commentText}>{comment.body}</Text>

      {comment.failed ? (
        // What someone just typed is never thrown away silently — it stays on
        // screen and offers to go again.
        <Pressable onPress={() => onReply?.(comment, true)} style={styles.failedRow}>
          <Icon name="alert-circle-outline" size={12} color={DS.colors.error} />
          <Text style={styles.failedText}>Couldn't send · Retry</Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onLike?.(comment)}
            disabled={comment.pending}
            style={styles.action}
            accessibilityLabel={comment.likedByMe ? 'Remove like' : 'Like'}
            accessibilityRole="button"
          >
            <Icon
              name={comment.likedByMe ? 'heart' : 'heart-outline'}
              size={13}
              color={comment.likedByMe ? DS.colors.primary : DS.colors.onSurfaceVariant}
            />
            {comment.likes > 0 && (
              <Text style={[styles.actionText, comment.likedByMe && styles.actionTextActive]}>
                {comment.likes}
              </Text>
            )}
          </Pressable>

          {!isReply && (
            <Pressable onPress={() => onReply?.(comment)} style={styles.action}>
              <Text style={styles.actionText}>Reply</Text>
            </Pressable>
          )}

          {comment.pending && <ActivityIndicator size="small" color={DS.colors.onSurfaceVariant} />}
        </View>
      )}
    </View>
  </View>
);

const CommentThreadSheet = ({
  visible,
  thread,
  roomName,
  quote,
  page,
  submitting,
  onSubmit,
  onLike,
  onRetry,
  onClose,
}) => {
  const [body, setBody] = useState('');
  // The cap has to be a number. As '62%' it resolved against the keyboard
  // wrapper, whose height is the sheet's own — so the only thing Yoga could
  // shrink to satisfy it was the comment list, and the thread vanished.
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetFrame = {
    maxHeight: windowHeight * 0.62,
    paddingBottom: Math.max(20, insets.bottom + 8),
  };
  const [replyTo, setReplyTo] = useState(null);
  const [expanded, setExpanded] = useState({});

  const comments = useMemo(() => thread?.comments || [], [thread]);
  const anchorText = quote ?? thread?.anchorText ?? '';
  const anchorPage = page ?? thread?.page ?? 0;
  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);

  // A fresh sheet starts empty — a draft aimed at one passage shouldn't follow
  // the reader to the next one.
  useEffect(() => {
    if (!visible) {
      setBody('');
      setReplyTo(null);
      setExpanded({});
    }
  }, [visible]);

  const handleSend = () => {
    const text = body.trim();
    if (!text || submitting) {
      return;
    }
    onSubmit?.({ body: text, parentId: replyTo?.id || null });
    setBody('');
    setReplyTo(null);
  };

  const handleReply = (comment, isRetry) => {
    if (isRetry) {
      onRetry?.(comment);
      return;
    }
    setReplyTo(comment);
  };

  const renderThread = (comment) => {
    const replies = comment.replies || [];
    const showAll = expanded[comment.id];
    const shown = showAll ? replies : replies.slice(0, VISIBLE_REPLIES);
    const hidden = replies.length - shown.length;

    return (
      <View key={comment.id}>
        <CommentRow comment={comment} onLike={onLike} onReply={handleReply} />
        {shown.map((reply) => (
          <CommentRow
            key={reply.id}
            comment={reply}
            isReply
            onLike={onLike}
            onReply={handleReply}
          />
        ))}
        {hidden > 0 && (
          <Pressable
            onPress={() => setExpanded((e) => ({ ...e, [comment.id]: true }))}
            style={styles.moreReplies}
          >
            <Text style={styles.moreRepliesText}>
              {hidden} more repl{hidden === 1 ? 'y' : 'ies'}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardWrap}
        >
          <Pressable style={[styles.sheet, sheetFrame]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {total} comment{total === 1 ? '' : 's'} · Page {anchorPage + 1}
              </Text>
              {roomName ? (
                <View style={styles.roomChip}>
                  <Icon name="people" size={10} color={DS.colors.primary} />
                  <Text style={styles.roomChipText} numberOfLines={1}>{roomName}</Text>
                </View>
              ) : null}
            </View>

            {/* Page-level threads have nothing to quote. */}
            {anchorText ? (
              <View style={styles.quoteBlock}>
                <Text style={styles.quoteText} numberOfLines={4}>{anchorText}</Text>
              </View>
            ) : null}

            {/* A ScrollView, not a FlatList: the sheet has only a maxHeight and
                sizes to its content, which a FlatList doesn't do — it collapsed
                and hid the thread under the composer. One passage's thread is
                short, so there's nothing to virtualize anyway. */}
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {comments.length === 0 ? (
                <Text style={styles.empty}>
                  Nothing here yet — say the first thing about this passage.
                </Text>
              ) : (
                comments.map(renderThread)
              )}
            </ScrollView>

            {replyTo && (
              <View style={styles.replyingTo}>
                <Text style={styles.replyingToText} numberOfLines={1}>
                  Replying to {replyTo.username}
                </Text>
                <Pressable onPress={() => setReplyTo(null)} accessibilityLabel="Cancel reply">
                  <Icon name="close" size={14} color={DS.colors.onSurfaceVariant} />
                </Pressable>
              </View>
            )}

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                value={body}
                onChangeText={setBody}
                placeholder="Add to the thread…"
                placeholderTextColor={DS.colors.onSurfaceVariant}
                multiline
                maxLength={2000}
                accessibilityLabel="Comment"
              />
              <Pressable
                onPress={handleSend}
                disabled={!body.trim() || submitting}
                style={[styles.send, (!body.trim() || submitting) && styles.sendDisabled]}
                accessibilityLabel="Post comment"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[DS.colors.primary, DS.colors.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendFill}
                />
                {submitting ? (
                  <ActivityIndicator size="small" color={DS.colors.onPrimary} />
                ) : (
                  <Icon name="arrow-up" size={18} color={DS.colors.onPrimary} />
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // The reader stays visible behind the sheet — the passage under discussion
  // is part of the conversation.
  backdrop: {
    flex: 1,
    backgroundColor: DS.colors.surfaceContainerLowest + '73', // 45%
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.colors.surfaceContainer,
    borderTopLeftRadius: DS.radius.hero,
    borderTopRightRadius: DS.radius.hero,
    paddingHorizontal: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.colors.surfaceContainerHighest,
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    fontFamily: DS.font.extraBold,
    fontSize: 14,
    color: DS.colors.onSurface,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 140,
    backgroundColor: DS.colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DS.radius.full,
  },
  roomChipText: {
    fontFamily: DS.font.bold,
    fontSize: 10,
    color: DS.colors.primary,
  },
  quoteBlock: {
    marginTop: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderLeftWidth: 3,
    borderLeftColor: DS.colors.primary,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quoteText: {
    fontStyle: 'italic',
    fontSize: 11.5,
    lineHeight: 17,
    color: DS.colors.onSurfaceVariant,
  },
  list: {
    marginTop: 14,
  },
  listContent: {
    paddingBottom: 8,
  },
  empty: {
    fontFamily: DS.font.medium,
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    paddingVertical: 20,
    textAlign: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  replyRow: {
    marginLeft: 40,
  },
  avatar: {
    backgroundColor: DS.colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  commentBody: {
    flex: 1,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentName: {
    fontFamily: DS.font.extraBold,
    fontSize: 12,
    color: DS.colors.onSurface,
    flexShrink: 1,
  },
  commentStamp: {
    fontFamily: DS.font.semibold,
    fontSize: 10,
    color: DS.colors.onSurfaceVariant,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.colors.primary,
  },
  commentText: {
    fontFamily: DS.font.medium,
    fontSize: 13,
    lineHeight: 19.5,
    color: DS.colors.onSurface,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontFamily: DS.font.bold,
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
  },
  actionTextActive: {
    color: DS.colors.primary,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  failedText: {
    fontFamily: DS.font.bold,
    fontSize: 11,
    color: DS.colors.error,
  },
  moreReplies: {
    marginLeft: 40,
    marginBottom: 16,
  },
  moreRepliesText: {
    fontFamily: DS.font.bold,
    fontSize: 11,
    color: DS.colors.primary,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.sm,
  },
  replyingToText: {
    flex: 1,
    fontFamily: DS.font.semibold,
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 40,
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.full,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: DS.font.medium,
    fontSize: 13,
    color: DS.colors.onSurface,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sendDisabled: {
    opacity: 0.4,
  },
});

export default CommentThreadSheet;
