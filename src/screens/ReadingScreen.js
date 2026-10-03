import { View, Text, StyleSheet, SectionList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import ShelfRow from '../components/ShelfRow';
import SeeAllHeader from '../components/SeeAllHeader';
import useRoomStore from '../stores/roomStore';
import FirstRunShelf from '../components/FirstRunShelf';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import { showToast } from '../components/Toaster';
import log from '../utils/logger';
import PressableScale from '../components/PressableScale';

// § 4a / 10d — the full reading shelf, reached from My Books' "See all" (8b).
// Every book with a position, grouped With rooms / Solo, one row per book
// even when several rooms read it ("AI Learning +1"; the pace line is the
// room it was last opened in). Rows untouched for 14 days dim as "Paused",
// and only the most recently read row has a play button. Tapping a room book
// opens the pace/comments view (1b); a solo book opens the lighter 4b detail
// — never Book detail (8c), which is for books found while browsing.
const SORTS = [
  { value: 'recent', label: 'Recent', icon: 'time-outline' },
  { value: 'progress', label: 'Progress', icon: 'pie-chart-outline' },
  { value: 'title', label: 'Title', icon: 'text-outline' },
];

const sortShelf = (books, sort) => {
  if (sort === 'progress') {
    return [...books].sort((a, b) => b.progressPct - a.progressPct || b.lastReadAt - a.lastReadAt);
  }
  if (sort === 'title') {
    return [...books].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
  }
  // The shelf already arrives most recently read first.
  return books;
};

const ReadingScreen = () => {
  const navigation = useNavigation();
  const shelf = useReadingProgressStore((s) => s.shelf);
  const activeBookLoaded = useReadingProgressStore((s) => s.activeBookLoaded);
  const loadActiveBook = useReadingProgressStore((s) => s.loadActiveBook);
  const refreshMemberProgress = useReadingProgressStore((s) => s.refreshMemberProgress);
  const rooms = useRoomStore((s) => s.rooms);
  const [sort, setSort] = useState('recent');

  // Subscribing to byBook, not only to the actions: action identities are
  // stable, so reading them alone would leave this tab frozen when comments
  // arrive from the network.
  const commentsByBook = useCommentsStore((s) => s.byBook);
  const refreshComments = useCommentsStore((s) => s.refreshComments);

  // Re-read on focus: a book just put down, or one a room picked, has to
  // appear here when the reader comes back from it.
  useFocusEffect(
    useCallback(() => {
      loadActiveBook();
      // Each shelf row carries its own room's pace track, so this sweeps every
      // room the shelf touches rather than just the hero's. Comments key the
      // same way, so they sweep alongside it.
      refreshMemberProgress();
      // Read back through the store rather than closing over this render's
      // `shelf`. loadActiveBook rebuilds the array from storage on every call, so a
      // `shelf` dependency here made the effect retrigger itself without end —
      // and the copy read after the rebuild is the fresher one anyway.
      refreshComments(useReadingProgressStore.getState().shelf);
    }, [loadActiveBook, refreshMemberProgress, refreshComments]),
  );

  const pickABook = () => navigation.navigate('Discover');
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
  const sorted = sortShelf(inProgress, sort);
  const roomBooks = sorted.filter((b) => b.roomName);
  const soloBooks = sorted.filter((b) => !b.roomName);
  // shelf is already sorted most-recently-read first, so the head of it is the
  // one row that gets the elevation and the play control, whatever the sort.
  const mostRecentId = inProgress[0]?.id;
  const sections = [
    { title: `With rooms · ${roomBooks.length}`, data: roomBooks },
    { title: `Solo · ${soloBooks.length}`, data: soloBooks },
  ].filter((section) => section.data.length > 0);

  // How many of your rooms are reading each book, for the "+N" on its chip.
  const roomsByBook = useMemo(() => {
    const counts = {};
    (rooms || []).forEach((room) => {
      if (room.currentBookId != null) {
        const key = String(room.currentBookId);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [rooms]);

  const backButton = (
    <PressableScale
      onPress={() => navigation.goBack()}
      style={styles.backButton}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
    </PressableScale>
  );

  // ── 3b: first run ─────────────────────────────────────────────────────
  // The shelf is only reached through a "See all" that needs a book behind
  // it, but the last book can still be finished or dropped while it's open.
  // Rendered only once the stored positions have been read back, so a reader
  // mid-book never sees this flash.
  if (inProgress.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <SafeAreaView edges={['top']}>
          <View style={styles.navRow}>{backButton}</View>
        </SafeAreaView>
        {activeBookLoaded && (
          <View style={styles.emptyContainer}>
            <FirstRunShelf onPickABook={pickABook} onJoinByCode={joinByCode} />
          </View>
        )}
      </View>
    );
  }

  const renderRow = ({ item: book }) => (
    <ShelfRow
      book={book}
      isMostRecent={book.id === mostRecentId}
      unreadCount={commentsByBook[book.id]?.unreadCount || 0}
      extraRooms={book.roomName ? Math.max(0, (roomsByBook[String(book.id)] || 0) - 1) : 0}
      onPress={openBook}
      onPlay={readNow}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SeeAllHeader
        title="Currently reading"
        subtitle={`${inProgress.length} book${inProgress.length === 1 ? '' : 's'}`}
        sort={{ options: SORTS, value: sort, onChange: setSort }}
      />

      <SectionList
        sections={sections}
        keyExtractor={(book) => String(book.id)}
        renderItem={renderRow}
        renderSectionHeader={({ section }) => (
          <Text style={styles.groupEyebrow}>{section.title}</Text>
        )}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListFooterComponent={finishedCount > 0 ? (
          <PressableScale
            onPress={() => showToast('Your finished books are coming soon', 'info')}
            style={styles.finishedLink}
            accessibilityRole="button"
          >
            <Icon name="checkmark-done" size={15} color={DS.colors.primary} />
            <Text style={styles.finishedText}>
              Finished · {finishedCount} book{finishedCount > 1 ? 's' : ''}
            </Text>
          </PressableScale>
        ) : null}
      />
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
  },
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

  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Groups
  groupEyebrow: {
    paddingTop: 22,
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
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
