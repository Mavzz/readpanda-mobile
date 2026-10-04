import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import ShelfRow from '../components/ShelfRow';
import FirstRunShelf from '../components/FirstRunShelf';
import BucketTile, { NewBucketTile } from '../components/BucketTile';
import useReadingProgressStore from '../stores/readingProgressStore';
import useBucketsStore from '../stores/bucketsStore';
import useCommentsStore from '../stores/commentsStore';
import { showToast } from '../components/Toaster';
import log from '../utils/logger';
import usePlusGate from '../hooks/usePlusGate';
import PressableScale from '../components/PressableScale';

// § 8b — My Books: everything that's yours. The two books you were most
// recently in (the 4a row, smaller), your buckets, and a link to what you've
// finished. Finding new books is Discover's job; nothing here is curated.
const PREVIEW_ROWS = 2;
// My buckets shows two whole tiles across before the row scrolls; "See all"
// (10e) appears only past that.
const BUCKET_SLOTS = 2;

const MyBooksScreen = () => {
  const navigation = useNavigation();
  const gate = usePlusGate();
  const shelf = useReadingProgressStore((s) => s.shelf);
  const activeBookLoaded = useReadingProgressStore((s) => s.activeBookLoaded);
  const loadActiveBook = useReadingProgressStore((s) => s.loadActiveBook);
  const refreshMemberProgress = useReadingProgressStore((s) => s.refreshMemberProgress);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const commentsByBook = useCommentsStore((s) => s.byBook);
  const refreshComments = useCommentsStore((s) => s.refreshComments);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    loadActiveBook();
    refreshMemberProgress();
    // Read back through the store, not this render's `shelf` — see the same
    // note in ReadingScreen.
    refreshComments(useReadingProgressStore.getState().shelf);
    await fetchCustomBuckets();
  }, [loadActiveBook, refreshMemberProgress, refreshComments, fetchCustomBuckets]);

  // A book just put down, or a bucket just made, has to show up on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // A book at 100% has left "Currently reading" — it's counted in the footer.
  const inProgress = shelf.filter((b) => !b.started || b.progressPct < 100);
  const finishedCount = shelf.length - inProgress.length;
  const preview = inProgress.slice(0, PREVIEW_ROWS);

  // Shelf rows open the reading views: 1b for a room book, 4b for a solo one.
  const openBook = (book) => {
    log.info('Opening My Books row:', book.title);
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

  // Rename, reorder and delete all live on the bucket's own screen (9a).
  const openBucket = (bucket) => {
    navigation.navigate('MyBucket', { bucketId: bucket.id, name: bucket.name });
  };

  const sectionHeader = (title, onSeeAll) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.eyebrow}>{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={10} accessibilityRole="button">
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <Text style={styles.title}>My Books</Text>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        )}
      >
        {/* ── Currently reading ──────────────────────────────── */}
        {/* Held back until the stored positions have been read, so a reader
            mid-book never sees the first-run block flash. */}
        {activeBookLoaded && (preview.length > 0 ? (
          <View style={styles.gutter}>
            {sectionHeader(
              `Currently reading · ${inProgress.length}`,
              inProgress.length > PREVIEW_ROWS ? () => navigation.navigate('Shelf') : null,
            )}
            {preview.map((book, i) => (
              <ShelfRow
                key={book.id}
                book={book}
                isMostRecent={i === 0}
                unreadCount={commentsByBook[book.id]?.unreadCount || 0}
                coverWidth={46}
                coverHeight={66}
                onPress={openBook}
                onPlay={readNow}
              />
            ))}
          </View>
        ) : (
          <FirstRunShelf
            style={styles.firstRun}
            onPickABook={() => navigation.navigate('Discover')}
            onJoinByCode={() => navigation.navigate('Rooms', { focusCode: true })}
          />
        ))}

        {/* ── My buckets ─────────────────────────────────────── */}
        <View style={[styles.gutter, styles.bucketsHeader]}>
          {sectionHeader(
            'My buckets',
            customBuckets.length > BUCKET_SLOTS
              ? () => navigation.navigate('BucketGrid', { variant: 'mine' })
              : null,
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bucketRow}
        >
          {customBuckets.map((bucket) => (
            <BucketTile
              key={bucket.id}
              variant="mine"
              progressKey={`bucket:${bucket.id}`}
              covers={bucket.booksPreview}
              name={bucket.name}
              bookCount={bucket.bookCount}
              finishedCount={bucket.finishedCount}
              saved={!!bucket.sourceCuratedId}
              onPress={() => openBucket(bucket)}
            />
          ))}
          <NewBucketTile onPress={() => gate('buckets', () => navigation.navigate('CreateBucketScreen'))} />
        </ScrollView>

        {/* ── Finished ───────────────────────────────────────── */}
        {finishedCount > 0 && (
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
  title: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
  },
  content: {
    paddingBottom: 32,
  },
  gutter: {
    paddingHorizontal: 24,
  },
  firstRun: {
    paddingVertical: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    marginBottom: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  bucketsHeader: {
    marginTop: 8,
  },
  bucketRow: {
    paddingHorizontal: 24,
    gap: 12,
  },
  finishedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 26,
  },
  finishedText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default MyBooksScreen;
