import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { useEffect, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import { showToast } from '../components/Toaster';
import { duotoneFor, COVER_SHADOW } from '../utils/covers';
import relativeTime from '../utils/relativeTime';
import log from '../utils/logger';

// § 4a — the Reading shelf. Every book with a position, grouped by whether a
// room is behind it: "Reading = my books, Rooms = ours". Tapping a room book
// opens the pace/comments view (1b); a solo book opens the lighter 4b detail.
const ReadingScreen = () => {
  const navigation = useNavigation();
  const shelf = useReadingProgressStore((s) => s.shelf);
  const activeBookLoaded = useReadingProgressStore((s) => s.activeBookLoaded);
  const loadActiveBook = useReadingProgressStore((s) => s.loadActiveBook);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);

  const loadFixtureComments = useCommentsStore((s) => s.loadFixtureComments);
  const unlockedComments = useCommentsStore((s) => s.unlockedComments);

  useEffect(() => {
    loadActiveBook();
    loadFixtureComments();
  }, []);

  // This tab stays mounted once visited, so re-read on focus: a book just put
  // down, or one a room picked, has to appear here without a restart.
  useFocusEffect(
    useCallback(() => {
      loadActiveBook();
      loadShelf();
    }, [loadActiveBook, loadShelf]),
  );

  const pickABook = () => navigation.navigate('Home', { screen: 'LibraryScreen' });
  const joinByCode = () => navigation.navigate('Rooms', { focusCode: true });

  const openBook = (book) => {
    log.info('Opening shelf row:', book.title);
    navigation.navigate(book.roomName ? 'RoomBookScreen' : 'SoloBookScreen', { bookId: book.id });
  };

  const readNow = (book) => {
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: book.id,
        title: book.title,
        cover_image_url: book.coverUrl,
        manuscript_url: book.manuscriptUrl,
      },
    });
  };

  // A book at 100% has left the shelf — it's counted in the footer instead.
  const inProgress = shelf.filter((b) => !b.started || b.progressPct < 100);
  const finishedCount = shelf.length - inProgress.length;
  const roomBooks = inProgress.filter((b) => b.roomName);
  const soloBooks = inProgress.filter((b) => !b.roomName);
  // shelf is already sorted most-recently-read first, so the head of it is the
  // one row that gets the elevation and the play control.
  const mostRecentId = inProgress[0]?.id;

  // ── 3b: first run ─────────────────────────────────────────────────────
  // Nothing read yet, so there is no data on the screen at all — just the
  // first step of the flow this tab will become. Rendered only once the stored
  // positions have been read back, so a reader mid-book never sees this flash.
  if (inProgress.length === 0) {
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

  const metaFor = (book) => {
    const position = book.started
      ? `Page ${book.chapter} of ${book.totalChapters}`
      : 'Not started yet';
    return `${position} · ${relativeTime(book.lastReadAt)}`;
  };

  // Room rows carry the social tail: comments waiting where there are any,
  // otherwise how the reader stands against the room's pace.
  const socialTailFor = (book) => {
    const waiting = unlockedComments(book.chapter).length;
    if (waiting > 0) {
      return `${waiting} comment${waiting > 1 ? 's' : ''} waiting`;
    }
    const members = book.memberProgress || [];
    const me = members.find((m) => m.isMe);
    const ahead = members
      .filter((m) => !m.isMe && m.progressPct > (me?.progressPct || 0))
      .sort((a, b) => b.progressPct - a.progressPct)[0];
    if (!ahead) {
      return 'Caught up';
    }
    const behind = Math.max(
      1,
      Math.round(((ahead.progressPct - (me?.progressPct || 0)) / 100) * book.totalChapters),
    );
    return `${behind} ch. behind`;
  };

  const renderRow = (book) => {
    const isMostRecent = book.id === mostRecentId;
    return (
      <Pressable
        key={book.id}
        onPress={() => openBook(book)}
        style={({ pressed }) => [
          styles.row,
          isMostRecent && styles.rowElevated,
          pressed && styles.pressed,
        ]}
        accessibilityLabel={`${book.title}, ${metaFor(book)}`}
        accessibilityRole="button"
      >
        <BookCoverGradient
          coverUrl={book.coverUrl}
          title={book.title}
          width={52}
          height={74}
          borderRadius={10}
          titleFontSize={8}
        />
        <View style={styles.rowContent}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>{book.title}</Text>
            {book.roomName ? (
              <View style={styles.roomChip}>
                <Icon name="people" size={11} color={DS.colors.primary} />
                <Text style={styles.roomChipText} numberOfLines={1}>{book.roomName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.rowTrack}>
            <LinearGradient
              colors={[DS.colors.primary, DS.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.rowFill, { width: `${book.progressPct}%` }]}
            />
          </View>

          <Text style={styles.rowMeta} numberOfLines={1}>
            {metaFor(book)}
            {book.roomName ? ' · ' : ''}
            {book.roomName ? (
              <Text style={styles.rowMetaAccent}>{socialTailFor(book)}</Text>
            ) : null}
          </Text>
        </View>

        {/* Only the book you were last in gets a one-tap way back into it. */}
        {isMostRecent && (
          <Pressable
            onPress={() => readNow(book)}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityLabel={`Continue reading ${book.title}`}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[DS.colors.primary, DS.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playButton}
            >
              <Icon name="play" size={15} color={DS.colors.onPrimary} />
            </LinearGradient>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reading</Text>
          <Text style={styles.headerSubtitle}>
            {inProgress.length} in progress
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {roomBooks.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupEyebrow}>In a room</Text>
            {roomBooks.map(renderRow)}
          </View>
        )}

        {soloBooks.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupEyebrow}>Reading solo</Text>
            {soloBooks.map(renderRow)}
          </View>
        )}

        {finishedCount > 0 && (
          <Pressable
            onPress={() => showToast('Your finished books are coming soon', 'info')}
            style={({ pressed }) => [styles.finishedLink, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="checkmark-done" size={15} color={DS.colors.primary} />
            <Text style={styles.finishedText}>
              Finished · {finishedCount} book{finishedCount > 1 ? 's' : ''}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
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
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Header (tab root — no back button)
  header: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 3,
  },
  content: {
    paddingBottom: 32,
  },

  // Groups
  group: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  groupEyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
  },
  rowElevated: {
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 130,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  roomChipText: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  rowTrack: {
    height: 5,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
    overflow: 'hidden',
    marginBottom: 8,
  },
  rowFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    // So a book a few pages in still reads as started rather than as an empty
    // track.
    minWidth: 8,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  rowMetaAccent: {
    color: DS.colors.primary,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Finished
  finishedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 22,
  },
  finishedText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default ReadingScreen;
