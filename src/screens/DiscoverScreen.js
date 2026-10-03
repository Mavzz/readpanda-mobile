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
const CURATED_SLOTS = 2;
const POPULAR_SLOTS = 3;


const DiscoverScreen = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const tileWidth = (width - GUTTER * 2 - GRID_GAP) / 2;

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
          <View style={[styles.sectionHeader, styles.firstSection, styles.gutter]}>
            <EyebrowBone style={styles.skeletonEyebrow} />
          </View>
          <View style={styles.grid}>
            <Bone width={tileWidth} height={150} radius={22} />
            <Bone width={tileWidth} height={150} radius={22} />
          </View>
          <View style={[styles.sectionHeader, styles.gutter]}>
            <EyebrowBone width={130} style={styles.skeletonEyebrow} />
          </View>
          <View style={[styles.popularRow, styles.skeletonRow]}>
            {[0, 1, 2, 3].map((i) => <CoverBone key={i} width={96} />)}
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
            <View style={[styles.sectionHeader, styles.firstSection, styles.gutter]}>
              <Text style={styles.eyebrow}>Curated buckets</Text>
              {curated.length > CURATED_SLOTS && (
                <Pressable onPress={seeAllCurated} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.grid}>
              {curated.slice(0, CURATED_SLOTS).map((bucket, i) => (
                <Animated.View key={`${genre || ''}:${bucket.id}`} entering={enteringFor(i)}>
                  <BucketTile
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
            <View style={[styles.sectionHeader, styles.gutter]}>
              <Text style={styles.eyebrow}>{genre ? `Popular in ${genreLabel}` : 'Popular this week'}</Text>
              {popular.length > POPULAR_SLOTS && (
                <Pressable onPress={seeAllPopular} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {popular.map((book, i) => (
                // The stagger runs on from the curated tiles above.
                <Animated.View
                  key={`${genre || ''}:${book.book_id}`}
                  entering={enteringFor(Math.min(curated.length, CURATED_SLOTS) + i)}
                >
                  <PressableScale
                    cover
                    onPress={() => openBook(book)}
                    style={styles.popularItem}
                    accessibilityRole="button"
                  >
                    <BookCoverGradient
                      coverUrl={book.cover_image_url}
                      title={book.title}
                      width={96}
                      height={138}
                      borderRadius={12}
                      titleFontSize={11}
                      elevated
                    />
                    <Text style={styles.popularTitle} numberOfLines={1}>{book.title}</Text>
                    {book.author_name ? (
                      <Text style={styles.popularAuthor} numberOfLines={1}>{book.author_name}</Text>
                    ) : null}
                  </PressableScale>
                </Animated.View>
              ))}
            </ScrollView>
          </>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <Text style={[styles.title, styles.gutter]}>Discover</Text>
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
        {/* The search results screen isn't built yet. */}
        <PressableScale
          onPress={() => showToast('Search is coming soon', 'info')}
          style={styles.search}
          accessibilityRole="search"
        >
          <Icon name="search" size={17} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.searchPlaceholder}>Title, author, or topic</Text>
        </PressableScale>

        <GenreChips genres={genres} value={genre} onChange={setGenre} gutter={GUTTER} />

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
  gutter: {
    paddingHorizontal: GUTTER,
  },
  title: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
    paddingTop: 18,
    paddingBottom: 14,
  },
  content: {
    paddingBottom: 32,
  },

  // Search
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: GUTTER,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainer,
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
    columnGap: GRID_GAP,
    rowGap: 18,
    paddingHorizontal: GUTTER,
  },

  // Popular
  popularRow: {
    paddingHorizontal: GUTTER,
    gap: 12,
  },
  popularItem: {
    width: 96,
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
