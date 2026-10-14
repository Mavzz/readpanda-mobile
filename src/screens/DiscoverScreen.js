import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import BucketTile from '../components/BucketTile';
import GenreChips from '../components/GenreChips';
import { curatedMeta } from '../utils/readingTime';
import { showToast } from '../components/Toaster';
import PressableScale from '../components/PressableScale';
import { Bone, CoverBone, EyebrowBone, useSkeletonDelay } from '../components/Skeleton';
import Animated from 'react-native-reanimated';
import useFilterEntrance from '../hooks/useFilterEntrance';
import useDiscoverPages from '../hooks/useDiscoverPages';
import useLayout from '../hooks/useLayout';

// § 8a — Discover: finding books, and only that. Search first (people who
// arrive with a title in mind are the fastest path), then genre chips, then
// curated buckets and a Popular row. No room chrome anywhere on this tab.
//
// "For you" is not a filter: it's the server's ranked mix of the reader's
// genres, books their room-mates have read, and what's popular. A genre chip
// is a single-select filter over both sections; tapping it again goes back
// to For you.
const GUTTER = 24;
const GRID_GAP = 12;
// "See all" shows only when a section holds more than it can show: one row
// of two curated tiles, and the ~3 Popular covers that fit across the screen.
//
// On iPad (15c landscape / 15o portrait) search moves up beside the title,
// curated buckets fill one row of 4 (3), and Popular becomes a grid of 8
// across (5 across, two rows) instead of a sideways row.
const CURATED_SLOTS = 2;
const POPULAR_SLOTS = 3;


const DiscoverScreen = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { isLarge, sizeClass, pagePad, columns } = useLayout();
  const gutter = isLarge ? pagePad : GUTTER;
  const pad = { paddingHorizontal: gutter };
  const gridGap = isLarge ? 20 : GRID_GAP;
  const curatedSlots = columns(CURATED_SLOTS, 3, 4);
  const tileWidth = (width - gutter * 2 - gridGap * (curatedSlots - 1)) / curatedSlots;
  const popularCols = columns(POPULAR_SLOTS, 5, 8);
  const popularGap = sizeClass === 'wide' ? 16 : 18;
  const popularSlots = isLarge ? popularCols * (sizeClass === 'wide' ? 1 : 2) : POPULAR_SLOTS;
  const popularWidth = (width - gutter * 2 - popularGap * (popularCols - 1)) / popularCols;

  const [genre, setGenre] = useState(null);
  const { page, genres, genreLabel, failed, reload } = useDiscoverPages(genre);
  const enteringFor = useFilterEntrance(genre);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const showSkeleton = useSkeletonDelay(!page && !failed);

  // Opened from a filtered view, 9b keeps that genre's books first.
  const openBucket = (bucket) => {
    navigation.navigate('CuratedBucket', { bucketId: bucket.id, name: bucket.name, genre, genreLabel });
  };


  const openBook = (book) => navigation.navigate('BookDetail', { book });

  // Both "See all" views keep the genre chip that's selected here.
  const seeAllPopular = () => navigation.navigate('BookGrid', { source: 'popular', genre });
  const seeAllCurated = () => navigation.navigate('BucketGrid', { variant: 'curated', genre });

  const renderPopular = (book, i) => {
    const coverWidth = isLarge ? popularWidth : 96;
    return (
      // The stagger runs on from the curated tiles above.
      <Animated.View
        key={`${genre || ''}:${book.book_id}`}
        entering={enteringFor(Math.min(page?.curated.length || 0, curatedSlots) + i)}
      >
        <PressableScale
          cover
          onPress={() => openBook(book)}
          style={{ width: coverWidth }}
          accessibilityRole="button"
        >
          <BookCoverGradient
            coverUrl={book.cover_image_url}
            title={book.title}
            width={coverWidth}
            height={isLarge ? Math.round(coverWidth * 1.5) : 138}
            borderRadius={12}
            titleFontSize={11}
            elevated
          />
          <Text style={[styles.popularTitle, isLarge && styles.popularTitleLarge]} numberOfLines={1}>
            {book.title}
          </Text>
          {book.author_name ? (
            <Text style={styles.popularAuthor} numberOfLines={1}>{book.author_name}</Text>
          ) : null}
        </PressableScale>
      </Animated.View>
    );
  };

  const search = (
    // The search results screen isn't built yet.
    <PressableScale
      onPress={() => showToast('Search is coming soon', 'info')}
      style={[styles.search, isLarge ? styles.searchLarge : { marginHorizontal: gutter }]}
      accessibilityRole="search"
    >
      <Icon name="search" size={17} color={DS.colors.onSurfaceVariant} />
      <Text style={styles.searchPlaceholder}>Title, author, or topic</Text>
    </PressableScale>
  );

  const renderBody = () => {
    if (!page) {
      return failed ? (
        <View style={styles.message}>
          <Icon name="cloud-offline-outline" size={30} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.messageText}>Couldn&apos;t load books. Pull to try again.</Text>
        </View>
      ) : showSkeleton ? (
        // Same shapes as a loaded page: two curated tiles, then a cover row.
        <>
          <View style={[styles.sectionHeader, styles.firstSection, pad]}>
            <EyebrowBone style={styles.skeletonEyebrow} />
          </View>
          <View style={[styles.grid, pad, { columnGap: gridGap }]}>
            {Array.from({ length: curatedSlots }, (_, i) => (
              <Bone key={i} width={tileWidth} height={isLarge ? 196 : 150} radius={22} />
            ))}
          </View>
          <View style={[styles.sectionHeader, pad]}>
            <EyebrowBone width={130} style={styles.skeletonEyebrow} />
          </View>
          <View style={[styles.popularRow, styles.skeletonRow, pad, isLarge && { gap: popularGap }]}>
            {Array.from({ length: isLarge ? popularCols : 4 }, (_, i) => (
              <CoverBone key={i} width={isLarge ? popularWidth : 96} />
            ))}
          </View>
        </>
      ) : null;
    }

    const { curated, popular } = page;
    if (curated.length === 0 && popular.length === 0) {
      return (
        <View style={styles.message}>
          <Icon name="book-outline" size={30} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.messageText}>
            {genre ? `Nothing in ${genreLabel} yet.` : 'Nothing here yet.'}
          </Text>
        </View>
      );
    }

    return (
      <>
        {curated.length > 0 && (
          <>
            <View style={[styles.sectionHeader, styles.firstSection, pad]}>
              <Text style={styles.eyebrow}>Curated buckets</Text>
              {curated.length > curatedSlots && (
                <Pressable onPress={seeAllCurated} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              )}
            </View>
            <View style={[styles.grid, pad, { columnGap: gridGap }]}>
              {curated.slice(0, curatedSlots).map((bucket, i) => (
                <Animated.View key={`${genre || ''}:${bucket.id}`} entering={enteringFor(i)}>
                  <BucketTile
                    large={isLarge}
                    variant="curated"
                    covers={bucket.booksPreview}
                    name={bucket.name}
                    meta={curatedMeta(bucket, genreLabel)}
                    width={tileWidth}
                    onPress={() => openBucket(bucket)}
                  />
                </Animated.View>
              ))}
            </View>
          </>
        )}

        {popular.length > 0 && (
          <>
            <View style={[styles.sectionHeader, pad]}>
              <Text style={styles.eyebrow}>{genre ? `Popular in ${genreLabel}` : 'Popular this week'}</Text>
              {popular.length > popularSlots && (
                <Pressable onPress={seeAllPopular} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              )}
            </View>
            {isLarge ? (
              <View style={[styles.popularGrid, pad, { columnGap: popularGap }]}>
                {popular.slice(0, popularSlots).map(renderPopular)}
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.popularRow, pad]}
              >
                {popular.map(renderPopular)}
              </ScrollView>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        {isLarge ? (
          <View style={[styles.titleRow, pad]}>
            <Text style={[styles.title, styles.titleLarge]}>Discover</Text>
            <View style={sizeClass === 'wide' ? styles.searchSlotWide : styles.searchSlotRegular}>{search}</View>
          </View>
        ) : (
          <Text style={[styles.title, pad]}>Discover</Text>
        )}
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
        {isLarge ? null : search}

        <GenreChips genres={genres} value={genre} onChange={setGenre} gutter={gutter} />

        {renderBody()}
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
    paddingTop: 18,
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
  },
  titleLarge: {
    ...DS.type.pageTitleLarge,
  },
  searchSlotWide: {
    width: 420,
  },
  searchSlotRegular: {
    width: 340,
  },
  content: {
    paddingBottom: 32,
  },

  // Search
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainer,
  },
  searchLarge: {
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  searchPlaceholder: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
  },

  // Sections
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 26,
  },
  // Curated sits straight under the chips, which carry their own spacing.
  firstSection: {
    marginTop: 0,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Curated grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },

  // Popular
  popularRow: {
    gap: 12,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 22,
  },
  // Eyebrow text is 11pt; a 10pt bone plus the eyebrow's 12 below, nudged
  // to sit where the cap height does.
  skeletonEyebrow: {
    marginTop: 3,
    marginBottom: 12,
  },
  // The skeleton cover row bleeds off the right edge like the real one.
  skeletonRow: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  popularTitle: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    marginTop: 8,
  },
  popularTitleLarge: {
    fontSize: 13,
  },
  popularAuthor: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },

  message: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: GUTTER,
  },
  messageText: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

export default DiscoverScreen;
