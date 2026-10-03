import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import CommentThreadSheet from '../components/CommentThreadSheet';
import log from '../utils/logger';
import PressableScale from '../components/PressableScale';
import ProgressFill from '../components/ProgressFill';

// The room read (§ 1b): where everyone in the room is, and comments unlocked
// or locked by chapter. Reached from a room row on the Reading shelf (4a);
// solo books get SoloBookScreen instead, which deliberately has none of this.
const RoomBookScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const bookId = route?.params?.bookId;

  const book = useReadingProgressStore((s) => s.shelf.find((b) => b.id === bookId));
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);
  const fetchMemberProgress = useReadingProgressStore((s) => s.fetchMemberProgress);

  // Subscribing to byBook, not only to the actions: action identities are
  // stable, so reading them alone would leave this screen frozen when the
  // comments actually arrive.
  const commentsByBook = useCommentsStore((s) => s.byBook);
  const loadComments = useCommentsStore((s) => s.loadComments);
  const toggleLike = useCommentsStore((s) => s.toggleLike);
  const markThreadRead = useCommentsStore((s) => s.markThreadRead);
  const retryComment = useCommentsStore((s) => s.retryComment);
  const addComment = useCommentsStore((s) => s.addComment);

  const [openThreadKey, setOpenThreadKey] = useState(null);

  useEffect(() => {
    loadShelf();
  }, []);

  // This screen is the pace track — one room, one book. Keyed on the room so
  // it re-asks if the shelf row arrives after the first render.
  useEffect(() => {
    if (book?.roomId) {
      fetchMemberProgress(book.roomId);
      loadComments(book.roomId, book.id);
    }
  }, [book?.roomId, book?.id, fetchMemberProgress, loadComments]);

  const handleContinue = () => {
    if (!book) {
      return;
    }
    log.info('Continue pressed for', book.title);
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: book.id,
        title: book.title,
        cover_image_url: book.coverUrl,
        manuscript_url: book.manuscriptUrl,
      },
    });
  };

  // The book can go while this screen is open — its room deleted, or the book
  // dropped with it. Fall back to the shelf rather than render half a screen.
  if (!book) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          <View style={styles.navRow}>
            <PressableScale
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
            </PressableScale>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const memberProgress = book.memberProgress || [];
  const me = memberProgress.find((m) => m.isMe);
  const behindOf = memberProgress
    .filter((m) => !m.isMe && m.progressPct > (me?.progressPct || 0))
    .sort((a, b) => b.progressPct - a.progressPct)[0];
  const chaptersBehind = behindOf
    ? Math.max(1, Math.round(((behindOf.progressPct - (me?.progressPct || 0)) / 100) * book.totalChapters))
    : 0;

  const commentEntry = commentsByBook[book.id];
  const threads = commentEntry?.threads || [];
  const lockedCount = commentEntry?.lockedCount || 0;
  const openThread = threads.find((t) => t.anchorKey === openThreadKey) || null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.topTrack}>
          <ProgressFill pct={book.progressPct} seenKey={`book:${book.id}`} style={styles.topFill} />
        </View>
        <View style={styles.navRow}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </PressableScale>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Book header ─────────────────────── */}
        <View style={styles.bookHeader}>
          <BookCoverGradient
            coverUrl={book.coverUrl}
            title={book.title}
            width={72}
            height={100}
            borderRadius={14}
            titleFontSize={10}
          />
          <View style={styles.bookHeaderText}>
            <Text style={styles.eyebrow}>{book.started ? 'Reading now' : 'Up next'}</Text>
            <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            <Text style={styles.bookMeta}>
              {book.started
                ? `${book.unit === 'page' ? 'Page' : 'Chapter'} ${book.chapter} of ${book.totalChapters}`
                : 'Not started yet'}
              {book.roomName ? ` · with ${book.roomName}` : ''}
            </Text>
          </View>
        </View>

        {/* ── Where everyone is ───────────────── */}
        {memberProgress.length > 0 && (
          <View style={styles.paceCard}>
            <Text style={styles.paceTitle}>Where everyone is</Text>
            <View style={styles.paceTrackWrap}>
              <View style={styles.paceTrack}>
                <ProgressFill pct={book.progressPct} seenKey={`book:${book.id}`} style={styles.paceFill} />
              </View>
              {memberProgress.map((m) => (
                <View
                  key={m.userId}
                  style={[
                    styles.paceAvatar,
                    { left: `${m.progressPct}%` },
                    m.isMe ? styles.paceAvatarMe : styles.paceAvatarOther,
                  ]}
                >
                  <Text style={m.isMe ? styles.paceAvatarTextMe : styles.paceAvatarText}>{m.initials}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.paceCaption}>
              {chaptersBehind > 0
                ? `You're ${chaptersBehind} chapter${chaptersBehind > 1 ? 's' : ''} behind ${behindOf.initials}. No spoilers — comments unlock as you read.`
                : 'You\'re caught up with everyone. No spoilers — comments unlock as you read.'}
            </Text>
          </View>
        )}

        {/* ── Unlocked comments ───────────────── */}
        {(threads.length > 0 || lockedCount > 0) && (
          <View style={styles.commentsSection}>
            {threads.length > 0 && (
              <Text style={styles.commentsSectionTitle}>
                Unlocked up to page {Math.max(...threads.map((t) => t.page)) + 1}
              </Text>
            )}

            {threads.map((thread) => {
              const root = thread.comments[0];
              if (!root) {
                return null;
              }
              const more = thread.comments.length - 1 + (root.replies?.length || 0);
              return (
                <Pressable
                  key={thread.anchorKey}
                  onPress={() => {
                    setOpenThreadKey(thread.anchorKey);
                    markThreadRead(book.id, thread.anchorKey);
                  }}
                  style={({ pressed }) => [styles.commentCard, pressed && styles.commentCardPressed]}
                >
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{root.initials}</Text>
                    </View>
                    <Text style={styles.commentName}>{root.username}</Text>
                    <Text style={styles.commentPage}>· p. {root.page + 1}</Text>
                    {thread.unreadCount > 0 && <View style={styles.unreadDot} />}
                  </View>
                  {/* Page-level comments have nothing to quote. */}
                  {thread.anchorText ? (
                    <View style={styles.quoteBlock}>
                      <Text style={styles.quoteText}>&ldquo;{thread.anchorText}&rdquo;</Text>
                    </View>
                  ) : null}
                  <Text style={styles.commentBody}>{root.body}</Text>
                  {more > 0 && (
                    <Text style={styles.threadMore}>
                      {more} more in this thread
                    </Text>
                  )}
                </Pressable>
              );
            })}

            {/* Everything still ahead of the reader is one number and nothing
                else — the server never sends a page or a preview for these. */}
            {lockedCount > 0 && (
              <View style={styles.lockedCard}>
                <View style={styles.lockedIcon}>
                  <Icon name="lock-closed" size={16} color={DS.colors.onSurfaceVariant} />
                </View>
                <View style={styles.lockedText}>
                  <Text style={styles.lockedTitle}>
                    {lockedCount} later in the book
                  </Text>
                  <Text style={styles.lockedSubtitle}>Keep reading to unlock them</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <GradientPill onPress={handleContinue} style={styles.cta}>
          <Text style={styles.ctaText}>
            {book.started
              ? `Continue ${book.unit === 'page' ? 'Page' : 'Chapter'} ${book.chapter}`
              : 'Start reading'}
          </Text>
        </GradientPill>
      </ScrollView>

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
  navRow: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  safeTop: {
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },

  // Top glow progress bar (the signature bar from DESIGN.md, previously unused)
  topTrack: {
    height: 4,
    backgroundColor: DS.colors.surfaceContainer,
  },
  topFill: {
    height: '100%',
    backgroundColor: DS.colors.primary,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },

  // Book header
  bookHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  bookHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bookTitle: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  bookMeta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
  },

  // Where everyone is
  paceCard: {
    margin: 24,
    marginBottom: 0,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 20,
    paddingTop: 18,
  },
  paceTitle: {
    fontSize: 13,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginBottom: 14,
  },
  paceTrackWrap: {
    position: 'relative',
    marginHorizontal: 6,
    marginBottom: 26,
    paddingTop: 12,
  },
  paceTrack: {
    height: 6,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },
  paceFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
  },
  paceAvatar: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: DS.colors.surfaceContainerLow,
  },
  paceAvatarMe: {
    backgroundColor: DS.colors.primary,
  },
  paceAvatarOther: {
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  paceAvatarText: {
    fontSize: 9,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  paceAvatarTextMe: {
    fontSize: 9,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  paceCaption: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },

  // Comments
  commentsSection: {
    margin: 24,
    marginBottom: 0,
  },
  commentsSectionTitle: {
    fontSize: 13,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginBottom: 12,
  },
  commentCard: {
    backgroundColor: DS.colors.surfaceContainerGlass,
    borderRadius: DS.radius.comment,
    padding: 16,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  commentCardPressed: {
    opacity: 0.85,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS.colors.primary,
  },
  threadMore: {
    marginTop: 8,
    fontFamily: DS.font.bold,
    fontSize: 11,
    color: DS.colors.primary,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 9,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  commentName: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  commentPage: {
    fontSize: 11,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurfaceVariant,
  },
  quoteBlock: {
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.background,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  quoteText: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 12,
    color: DS.colors.onSurfaceVariant,
  },
  commentBody: {
    fontSize: 13,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurface,
    lineHeight: 19,
  },
  lockedCard: {
    borderRadius: DS.radius.comment,
    backgroundColor: DS.colors.surfaceContainerLow,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockedIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  lockedSubtitle: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },

  // CTA
  cta: {
    margin: 24,
    marginTop: 20,
    marginBottom: 40,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },

});

export default RoomBookScreen;
