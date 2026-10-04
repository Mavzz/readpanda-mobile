import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReorderableList, { reorderItems, useReorderableDrag } from 'react-native-reorderable-list';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import CoverFan from '../components/CoverFan';
import GradientPill from '../components/GradientPill';
import { showToast } from '../components/Toaster';
import useBucketsStore from '../stores/bucketsStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import bucketProgress from '../utils/bucketProgress';
import { toReaderBook } from '../utils/readerBook';
import { sameId } from '../utils/bookId';
import { booksLabel } from '../utils/readingTime';
import log from '../utils/logger';
import PressableScale from '../components/PressableScale';
import ProgressFill from '../components/ProgressFill';

// § 9a — one of your buckets, pushed from My Books (tab bar stays). A list,
// not a grid: each row says where you are in that book, sorted so what you're
// reading comes first, then what's next (in your order), then what's done.
//
// Edit shows your manual order with drag handles and a red minus; swiping a
// row left deletes it in either mode. Nothing sits on the covers.
const STATUS_RANK = { reading: 0, notStarted: 1, finished: 2 };

// ── Row ─────────────────────────────────────────────────────────────────────
const BookRow = ({ book, progress, editing, onPress, onRemove, drag }) => {
  const status = progress?.status || 'notStarted';
  const finished = status === 'finished';

  let trailing = <Text style={styles.statusMuted}>Not started</Text>;
  if (status === 'reading') {
    trailing = <Text style={styles.statusPage}>p. {progress.page}</Text>;
  } else if (finished) {
    trailing = <Text style={styles.statusDone}>✓ Done</Text>;
  }

  return (
    <Pressable
      onPress={editing ? undefined : () => onPress(book, progress)}
      onLongPress={editing ? drag : undefined}
      delayLongPress={150}
      style={[styles.row, finished && !editing && styles.rowDone]}
      accessibilityLabel={`${book.title}, ${status === 'reading' ? `page ${progress.page}` : status === 'finished' ? 'done' : 'not started'}`}
      accessibilityRole="button"
    >
      {editing && (
        <Pressable
          onPress={() => onRemove(book)}
          hitSlop={8}
          accessibilityLabel={`Remove ${book.title}`}
          accessibilityRole="button"
        >
          <Icon name="remove-circle" size={22} color={DS.colors.error} />
        </Pressable>
      )}
      <BookCoverGradient
        coverUrl={book.cover_image_url}
        title={book.title}
        width={46}
        height={66}
        borderRadius={8}
        titleFontSize={7}
      />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{book.title}</Text>
        {book.author_name ? (
          <Text style={styles.rowAuthor} numberOfLines={1}>{book.author_name}</Text>
        ) : null}
        {status === 'reading' && !editing && (
          <View style={styles.rowTrack}>
            <ProgressFill
              pct={progress.pct}
              seenKey={`book:${book.book_id}`}
              colors={[DS.colors.primary, DS.colors.secondary]}
              style={styles.rowFill}
            />
          </View>
        )}
      </View>
      {editing ? (
        <Pressable
          onPressIn={drag}
          hitSlop={10}
          accessibilityLabel={`Reorder ${book.title}`}
          accessibilityRole="adjustable"
        >
          <Icon name="reorder-three" size={24} color={DS.colors.onSurfaceVariant} />
        </Pressable>
      ) : (
        trailing
      )}
    </Pressable>
  );
};

// Swipe left to reveal Delete, in both modes.
const SwipeRow = (props) => (
  <ReanimatedSwipeable
    friction={2}
    rightThreshold={40}
    overshootRight={false}
    renderRightActions={() => (
      <Pressable
        onPress={() => props.onRemove(props.book)}
        style={styles.swipeDelete}
        accessibilityLabel={`Delete ${props.book.title}`}
        accessibilityRole="button"
      >
        <Icon name="trash-outline" size={18} color={DS.colors.onPrimary} />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </Pressable>
    )}
  >
    <BookRow {...props} />
  </ReanimatedSwipeable>
);

// ReorderableList's drag hook only works inside its own cells.
const ReorderRow = (props) => {
  const drag = useReorderableDrag();
  return <SwipeRow {...props} drag={drag} />;
};

// ── Screen ──────────────────────────────────────────────────────────────────
const MyBucketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const bucketId = route.params?.bucketId;

  const bucket = useBucketsStore((s) => s.customBuckets.find((b) => b.id === bucketId));
  const fetchBucketBooks = useBucketsStore((s) => s.fetchBucketBooks);
  const removeBookFromBucket = useBucketsStore((s) => s.removeBookFromBucket);
  const reorderBucket = useBucketsStore((s) => s.reorderBucket);
  const renameBucket = useBucketsStore((s) => s.renameBucket);
  const deleteBucket = useBucketsStore((s) => s.deleteBucket);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);
  const startBook = useReadingProgressStore((s) => s.startBook);

  // `books` is the bucket's manual order, as the server keeps it.
  const [books, setBooks] = useState(null);
  // 10e's long-press "Reorder books" opens straight into edit mode.
  const [editing, setEditing] = useState(!!route.params?.editing);
  const name = bucket?.name || route.params?.name || '';

  useFocusEffect(
    useCallback(() => {
      loadShelf();
      fetchBucketBooks(bucketId).then(({ status, response }) => {
        if (status === 200) {
          setBooks(response.books);
        }
      });
    }, [bucketId, fetchBucketBooks, loadShelf]),
  );

  const progressById = useMemo(() => {
    const byId = Object.fromEntries(shelf.map((b) => [b.id, b]));
    return Object.fromEntries((books || []).map((b) => [b.book_id, bucketProgress(b, byId[b.book_id])]));
  }, [books, shelf]);

  // In progress (most recent first) → not started (manual order) → finished.
  const sorted = useMemo(() => {
    const list = (books || []).map((b, i) => ({ book: b, i, p: progressById[b.book_id] }));
    list.sort((a, b) => {
      const ra = STATUS_RANK[a.p?.status || 'notStarted'];
      const rb = STATUS_RANK[b.p?.status || 'notStarted'];
      if (ra !== rb) {
        return ra - rb;
      }
      if (ra === STATUS_RANK.reading) {
        return b.p.lastReadAt - a.p.lastReadAt;
      }
      return a.i - b.i;
    });
    return list.map((x) => x.book);
  }, [books, progressById]);

  const total = books?.length || 0;
  const finishedCount = (books || []).filter((b) => progressById[b.book_id]?.status === 'finished').length;

  // The primary pill: carry on with the book you were last in, else start the
  // first one you haven't, else nothing — everything's done.
  const reading = sorted.find((b) => progressById[b.book_id]?.status === 'reading');
  const unstarted = sorted.find((b) => (progressById[b.book_id]?.status || 'notStarted') === 'notStarted');
  const primary = reading
    ? { label: `Continue ${reading.title}`, book: reading }
    : unstarted && { label: `Start ${unstarted.title}`, book: unstarted };

  const openReader = (book) => {
    const readerBook = toReaderBook(book);
    // A book with no entry yet gets a solo one, as from Book detail (8c).
    if (!shelf.some((b) => sameId(b.id, readerBook.book_id))) {
      startBook(readerBook);
    }
    navigation.navigate('ManuscriptScreen', { book: readerBook });
  };

  // Every row opens Book detail (8c), as from a curated bucket: taps from
  // buckets go to 8c, and only shelf rows open 4b / 1b. 8c turns its
  // primary into "Continue page {p}" when the book has progress.
  const openRow = (book) => navigation.navigate('BookDetail', { book });

  const removeBook = (book) => {
    log.info('Removing from bucket:', book.title);
    const before = books;
    setBooks((prev) => prev.filter((b) => b.book_id !== book.book_id));
    removeBookFromBucket(bucketId, book.book_id).then((ok) => {
      if (!ok) {
        setBooks(before);
      }
    });
  };

  const onReorder = ({ from, to }) => {
    const next = reorderItems(books, from, to);
    setBooks(next);
    reorderBucket(bucketId, next.map((b) => b.book_id));
  };

  // Rename has no sheet of its own yet; iOS's text prompt stands in.
  const rename = () => {
    if (Platform.OS !== 'ios') {
      showToast('Renaming is coming soon', 'info');
      return;
    }
    Alert.prompt('Rename bucket', undefined, (value) => {
      const next = (value || '').trim();
      if (next && next !== name) {
        renameBucket(bucketId, next.slice(0, 40));
      }
    }, 'plain-text', name);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete bucket',
      `Delete "${name}"? The books stay in your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBucket(bucketId);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const openMenu = () => {
    Alert.alert(name, undefined, [
      { text: 'Rename', onPress: rename },
      { text: 'Delete bucket', style: 'destructive', onPress: confirmDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const header = (
    <View>
      <View style={styles.header}>
        <CoverFan
          covers={(books || []).slice(0, 3)}
          seed={name}
          width={112}
          height={104}
          coverWidth={56}
          coverHeight={80}
          offset={22}
        />
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>My bucket</Text>
          <Text style={styles.title} numberOfLines={2}>{name}</Text>
          <Text style={styles.meta}>
            {booksLabel(total)} · {finishedCount} finished
          </Text>
        </View>
      </View>

      {!editing && (
        <View style={styles.actions}>
          {primary ? (
            <GradientPill onPress={() => openReader(primary.book)} style={styles.primary}>
              <Text style={styles.primaryText} numberOfLines={1}>{primary.label}</Text>
            </GradientPill>
          ) : (
            <View style={styles.primary} />
          )}
          {/* The add-books picker (search + Discover) isn't built yet. */}
          <PressableScale
            onPress={() => showToast('Adding books from here is coming soon', 'info')}
            style={styles.addButton}
            accessibilityLabel="Add books"
            accessibilityRole="button"
          >
            <Icon name="add" size={22} color={DS.colors.primary} />
          </PressableScale>
        </View>
      )}
    </View>
  );

  const rowProps = (book) => ({
    book,
    progress: progressById[book.book_id],
    editing,
    onPress: openRow,
    onRemove: removeBook,
  });

  const empty = books && books.length === 0 ? (
    <Text style={styles.empty}>Nothing in this bucket yet.</Text>
  ) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <View style={styles.navRow}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.navButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </PressableScale>
          <View style={styles.navRight}>
            <PressableScale
              onPress={() => setEditing((e) => !e)}
              style={[styles.editPill, editing && styles.editPillOn]}
              accessibilityRole="button"
            >
              <Text style={[styles.editText, editing && styles.editTextOn]}>{editing ? 'Done' : 'Edit'}</Text>
            </PressableScale>
            <PressableScale
              onPress={openMenu}
              style={styles.navButton}
              accessibilityLabel="More"
              accessibilityRole="button"
            >
              <Icon name="ellipsis-horizontal" size={18} color={DS.colors.onSurface} />
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>

      {editing ? (
        <ReorderableList
          data={books || []}
          keyExtractor={(b) => b.book_id}
          onReorder={onReorder}
          renderItem={({ item }) => <ReorderRow {...rowProps(item)} />}
          ItemSeparatorComponent={Divider}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(b) => b.book_id}
          renderItem={({ item }) => <SwipeRow {...rowProps(item)} />}
          ItemSeparatorComponent={Divider}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// Inset to the text column: cover 46 + gap 14.
const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editPill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
  },
  editPillOn: {
    backgroundColor: DS.colors.primary,
  },
  editText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  editTextOn: {
    color: DS.colors.onPrimary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 18,
  },
  headerText: {
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
  title: {
    fontSize: 24,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
  },
  meta: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 12,
  },
  primary: {
    flex: 1,
  },
  primaryText: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  list: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    backgroundColor: DS.colors.background,
  },
  rowDone: {
    opacity: 0.65,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  rowAuthor: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  rowTrack: {
    width: 120,
    height: 4,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    overflow: 'hidden',
    marginTop: 8,
  },
  rowFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    minWidth: 4,
  },
  statusPage: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  statusMuted: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  statusDone: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
    backgroundColor: DS.colors.outlineVariant,
  },
  swipeDelete: {
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DS.colors.error,
  },
  swipeDeleteText: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onPrimary,
  },
  empty: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default MyBucketScreen;
