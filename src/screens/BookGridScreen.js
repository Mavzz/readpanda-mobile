import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import GenreChips from '../components/GenreChips';
import SeeAllHeader from '../components/SeeAllHeader';
import useBucketsStore from '../stores/bucketsStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import { booksLabel } from '../utils/readingTime';
import PressableScale from '../components/PressableScale';
import { CoverGridSkeleton, useSkeletonDelay } from '../components/Skeleton';
import ProgressFill from '../components/ProgressFill';
import Animated from 'react-native-reanimated';
import useFilterEntrance from '../hooks/useFilterEntrance';
import useDiscoverPages from '../hooks/useDiscoverPages';

// § 10c — "See all" for books you're browsing: a 3-column grid of 2:3 covers.
//
//   source 'popular'        Discover › Popular this week. Ranked, with the
//                           genre chips (keeping the one selected on 8a) and
//                           a sort: Most read / Newest / Shortest.
//   source 'curatedForYou'  Home › Curated for you: every book in those
//                           buckets (`bucketIds`, in Home's order). Not ranked.
//
// Rank badges appear only on a ranked list in its ranked order. Each cover
// reads the reader's own state for the book: a progress bar and the page if
// started, a check and 70% opacity if finished. Tapping a cover opens 8c.
const GUTTER = 24;
const GAP = 12;
const COLUMNS = 3;

const SORTS = [
  { value: 'mostRead', label: 'Most read', icon: 'trending-up' },
  { value: 'newest', label: 'Newest', icon: 'sparkles-outline' },
  { value: 'shortest', label: 'Shortest', icon: 'time-outline' },
];

const sortBooks = (books, sort) => {
  if (sort === 'newest') {
    return [...books].sort((a, b) => new Date(b.added_at || 0) - new Date(a.added_at || 0));
  }
  if (sort === 'shortest') {
    // Books whose length isn't known yet go last rather than first.
    const pages = (b) => b.page_count || Number.MAX_SAFE_INTEGER;
    return [...books].sort((a, b) => pages(a) - pages(b));
  }
  return books;
};

const BookGridScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const source = route.params?.source || 'popular';
  const ranked = source === 'popular';

  const [genre, setGenre] = useState(route.params?.genre || null);
  const enteringFor = useFilterEntrance(genre);
  const [sort, setSort] = useState('mostRead');
  // Popular comes from Discover's page for the chip; Curated for you is built
  // here from its buckets.
  const discover = useDiscoverPages(genre, { enabled: ranked });
  const [curated, setCurated] = useState(undefined);
  const [curatedFailed, setCuratedFailed] = useState(false);

  const fetchCuratedBucketBooks = useBucketsStore((s) => s.fetchCuratedBucketBooks);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);

  // Every book across the buckets, in bucket order, each book once.
  const loadCurated = useCallback(async () => {
    const ids = route.params?.bucketIds || [];
    const results = await Promise.all(ids.map((id) => fetchCuratedBucketBooks(id)));
    const seen = new Set();
    const books = [];
    results.forEach(({ status, response }) => {
      if (status !== 200) {
        return;
      }
      response.books.forEach((book) => {
        if (!seen.has(book.book_id)) {
          seen.add(book.book_id);
          books.push(book);
        }
      });
    });
    setCuratedFailed(books.length === 0 && results.some((r) => r.status !== 200));
    setCurated(books);
  }, [route.params?.bucketIds, fetchCuratedBucketBooks]);

  useEffect(() => {
    if (source === 'curatedForYou') {
      loadCurated();
    }
  }, [source, loadCurated]);

  // Covers follow the reader: coming back from a book has to update them.
  useFocusEffect(
    useCallback(() => {
      loadShelf();
    }, [loadShelf]),
  );

  const shelfById = useMemo(() => Object.fromEntries(shelf.map((b) => [b.id, b])), [shelf]);
  const loadedBooks = ranked ? discover.page?.popular : curated;
  const failed = ranked ? discover.failed : curatedFailed;
  const { genres, genreLabel } = discover;
  const books = useMemo(() => sortBooks(loadedBooks || [], sort), [loadedBooks, sort]);
  const showRank = ranked && sort === 'mostRead';

  const cellWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const coverHeight = cellWidth * 1.5;

  const title = source === 'popular'
    ? (genre ? `Popular in ${genreLabel}` : 'Popular this week')
    : route.params?.title || 'Curated for you';
  const subtitle = source === 'popular'
    ? 'Most read in the last 7 days'
    : (books.length ? booksLabel(books.length) : null);

  const renderBook = ({ item: book, index }) => {
    const entry = shelfById[book.book_id];
    const finished = !!entry?.started && entry.progressPct >= 100;
    const reading = !!entry?.started && !finished;
    return (
      <Animated.View entering={enteringFor(index)}>
        <PressableScale
          cover
          onPress={() => navigation.navigate('BookDetail', { book })}
          style={[{ width: cellWidth }]}
          accessibilityLabel={[
            book.title,
            book.author_name,
            reading && `page ${entry.chapter}`,
            finished && 'finished',
          ].filter(Boolean).join(', ')}
          accessibilityRole="button"
        >
          <View style={finished && styles.finishedCover}>
            <BookCoverGradient
              coverUrl={book.cover_image_url}
              title={book.title}
              width={cellWidth}
              height={coverHeight}
              borderRadius={12}
              titleFontSize={10}
            />
            {showRank ? (
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
            ) : null}
            {reading ? (
              <View style={styles.track}>
                <ProgressFill pct={Math.max(entry.progressPct, 4)} seenKey={`book:${book.book_id}`} style={styles.fill} />
              </View>
            ) : null}
          </View>
          {finished ? (
            <View style={[styles.check, { top: coverHeight - 30 }]}>
              <Icon name="checkmark" size={13} color={DS.colors.onPrimary} />
            </View>
          ) : null}
          <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
          {reading ? (
            <Text style={styles.page} numberOfLines={1}>p. {entry.chapter}</Text>
          ) : book.author_name ? (
            <Text style={styles.author} numberOfLines={1}>{book.author_name}</Text>
          ) : null}
        </PressableScale>
      </Animated.View>
    );
  };

  const loaded = loadedBooks !== undefined;
  const showSkeleton = useSkeletonDelay(!loaded && !failed);
  const empty = () => {
    if (loaded) {
      return (
        <View style={styles.message}>
          <Icon name="book-outline" size={30} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.messageText}>Nothing here yet.</Text>
        </View>
      );
    }
    if (failed) {
      return (
        <View style={styles.message}>
          <Icon name="cloud-offline-outline" size={30} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.messageText}>Couldn&apos;t load books.</Text>
        </View>
      );
    }
    return showSkeleton
      ? <CoverGridSkeleton columns={COLUMNS} cellWidth={cellWidth} count={COLUMNS * 3} gap={GAP} />
      : null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SeeAllHeader
        title={title}
        subtitle={subtitle}
        sort={ranked ? { options: SORTS, value: sort, onChange: setSort } : null}
      />
      <FlatList
        data={books}
        // Keyed by genre too, so a chip change remounts the cells and they rise in.
        keyExtractor={(book) => `${genre || ''}:${book.book_id}`}
        renderItem={renderBook}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={ranked && genres.length > 0 ? (
          <View style={styles.chipsBleed}>
            <GenreChips genres={genres} value={genre} onChange={setGenre} allLabel="All" />
          </View>
        ) : <View style={styles.headerGap} />}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    paddingHorizontal: GUTTER,
    paddingBottom: 32,
  },
  // The chip row scrolls edge to edge, past the grid's gutter.
  chipsBleed: {
    marginHorizontal: -GUTTER,
  },
  headerGap: {
    height: 16,
  },
  row: {
    gap: GAP,
    marginBottom: 18,
  },
  finishedCover: {
    opacity: 0.7,
  },
  rank: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: DS.colors.surfaceContainerLowest + 'BF', // ~75%
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  track: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 4,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest + '99', // ~60%
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
  },
  // Outside the dimmed cover so the check itself stays at full strength.
  check: {
    position: 'absolute',
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    marginTop: 8,
  },
  author: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  page: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
    marginTop: 2,
  },
  message: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
  },
  messageText: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

export default BookGridScreen;
