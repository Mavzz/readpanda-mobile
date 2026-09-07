import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import { duotoneFor, COVER_SHADOW } from '../utils/covers';
import log from '../utils/logger';

// Replaces the old (empty) Current Read tab — the async book-club core made
// visible: where everyone in the room is, and comments unlocked/locked by
// chapter. See design_handoff_redesign § 1b.
const ReadingScreen = () => {
  const navigation = useNavigation();
  const activeBook = useReadingProgressStore((s) => s.activeBook);
  const activeBookLoaded = useReadingProgressStore((s) => s.activeBookLoaded);
  const memberProgress = useReadingProgressStore((s) => s.memberProgress);
  const loadActiveBook = useReadingProgressStore((s) => s.loadActiveBook);

  const loadFixtureComments = useCommentsStore((s) => s.loadFixtureComments);
  const unlockedComments = useCommentsStore((s) => s.unlockedComments);
  const nextLockedBatch = useCommentsStore((s) => s.nextLockedBatch);

  useEffect(() => {
    loadActiveBook();
    loadFixtureComments();
  }, []);

  const handleContinue = () => {
    if (!activeBook) {
      return;
    }
    log.info('Continue chapter pressed for', activeBook.title);
    navigation.navigate('Home', {
      screen: 'ManuscriptScreen',
      params: {
        book: {
          book_id: activeBook.id,
          title: activeBook.title,
          manuscript_url: activeBook.manuscriptUrl,
        },
      },
    });
  };

  const pickABook = () => navigation.navigate('Home', { screen: 'LibraryScreen' });
  const joinByCode = () => navigation.navigate('Rooms', { focusCode: true });

  // ── 3b: first run ─────────────────────────────────────────────────────
  // No reading progress yet, so there is no top progress bar and no data on
  // the screen at all — just the first step of the flow this tab will become.
  // Rendered only once the last-read position has actually been read back, so
  // a reader mid-book never sees this flash past.
  if (!activeBook) {
    if (!activeBookLoaded) {
      return <View style={styles.container} />;
    }
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <View style={styles.emptyContainer}>
          {/* Pure decoration — two tilted covers, no book behind them. */}
          <View style={styles.illustration}>
            <LinearGradient
              colors={duotoneFor('nightstand-left')}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.illustrationCover, styles.illustrationLeft]}
            />
            <LinearGradient
              colors={duotoneFor('nightstand-right')}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.illustrationCover, styles.illustrationRight]}
            >
              <Icon name="moon-outline" size={26} color={DS.colors.primary} />
            </LinearGradient>
          </View>

          <Text style={styles.firstRunTitle}>Nothing on your nightstand yet</Text>
          <Text style={styles.firstRunBody}>
            Pick a book and this tab becomes your reading home — your progress, your friends&apos;
            pace, and their comments unlocking as you go.
          </Text>

          <GradientPill onPress={pickABook} style={styles.firstRunCta}>
            <Text style={styles.ctaText}>Pick a book</Text>
          </GradientPill>

          <Pressable
            onPress={joinByCode}
            style={({ pressed }) => [styles.firstRunLink, pressed && styles.pressed]}
          >
            <Text style={styles.firstRunLinkText}>Have an invite code? Join a room</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const me = memberProgress.find((m) => m.isMe);
  const behindOf = memberProgress
    .filter((m) => !m.isMe && m.progressPct > (me?.progressPct || 0))
    .sort((a, b) => b.progressPct - a.progressPct)[0];
  const chaptersBehind = behindOf
    ? Math.max(1, Math.round(((behindOf.progressPct - (me?.progressPct || 0)) / 100) * activeBook.totalChapters))
    : 0;

  const unlocked = unlockedComments(activeBook.chapter);
  const lockedBatch = nextLockedBatch(activeBook.chapter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.topTrack}>
          <View style={[styles.topFill, { width: `${activeBook.progressPct}%` }]} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Book header ─────────────────────────────────────── */}
        <View style={styles.bookHeader}>
          <BookCoverGradient
            coverUrl={activeBook.coverUrl}
            title={activeBook.title}
            width={72}
            height={100}
            borderRadius={14}
            titleFontSize={10}
          />
          <View style={styles.bookHeaderText}>
            <Text style={styles.eyebrow}>Reading now</Text>
            <Text style={styles.bookTitle} numberOfLines={2}>{activeBook.title}</Text>
            <Text style={styles.bookMeta}>
              {activeBook.unit === 'page' ? 'Page' : 'Chapter'} {activeBook.chapter} of{' '}
              {activeBook.totalChapters}
              {activeBook.roomName ? ` · with ${activeBook.roomName}` : ''}
            </Text>
          </View>
        </View>

        {/* ── Where everyone is ──────────────────────────────── */}
        <View style={styles.paceCard}>
          <Text style={styles.paceTitle}>Where everyone is</Text>
          <View style={styles.paceTrackWrap}>
            <View style={styles.paceTrack}>
              <View style={[styles.paceFill, { width: `${activeBook.progressPct}%` }]} />
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

        {/* ── Unlocked comments ──────────────────────────────── */}
        {(unlocked.length > 0 || lockedBatch) && (
          <View style={styles.commentsSection}>
            {unlocked.length > 0 && (
              <Text style={styles.commentsSectionTitle}>
                Unlocked at Chapter {Math.max(...unlocked.map((c) => c.anchor.chapter))}
              </Text>
            )}

            {unlocked.map((c) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>{c.userInitials}</Text>
                  </View>
                  <Text style={styles.commentName}>{c.userName}</Text>
                  <Text style={styles.commentPage}>· p. {c.anchor.page}</Text>
                </View>
                <View style={styles.quoteBlock}>
                  <Text style={styles.quoteText}>&ldquo;{c.quote}&rdquo;</Text>
                </View>
                <Text style={styles.commentBody}>{c.body}</Text>
              </View>
            ))}

            {lockedBatch && (
              <View style={styles.lockedCard}>
                <View style={styles.lockedIcon}>
                  <Icon name="lock-closed" size={16} color={DS.colors.onSurfaceVariant} />
                </View>
                <View style={styles.lockedText}>
                  <Text style={styles.lockedTitle}>
                    {lockedBatch.count} comment{lockedBatch.count > 1 ? 's' : ''} waiting at Chapter {lockedBatch.chapter}
                  </Text>
                  <Text style={styles.lockedSubtitle}>Keep reading to unlock them</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <GradientPill onPress={handleContinue} style={styles.cta}>
          <Text style={styles.ctaText}>
            Continue {activeBook.unit === 'page' ? 'Page' : 'Chapter'} {activeBook.chapter}
          </Text>
        </GradientPill>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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

  // First run (3b)
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  illustrationCover: {
    width: 78,
    height: 110,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...COVER_SHADOW,
  },
  illustrationLeft: {
    transform: [{ rotate: '-7deg' }],
  },
  illustrationRight: {
    marginLeft: -14,
    transform: [{ rotate: '5deg' }],
  },
  firstRunTitle: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 10,
  },
  firstRunBody: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  firstRunCta: {
    alignSelf: 'stretch',
  },
  firstRunLink: {
    marginTop: 16,
  },
  firstRunLinkText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

export default ReadingScreen;
