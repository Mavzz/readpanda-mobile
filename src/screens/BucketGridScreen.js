import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BucketTile, { NewBucketTile } from '../components/BucketTile';
import GenreChips from '../components/GenreChips';
import SeeAllHeader from '../components/SeeAllHeader';
import RenameBucketSheet from '../components/RenameBucketSheet';
import useBucketsStore from '../stores/bucketsStore';
import { curatedMeta } from '../utils/readingTime';
import { Bone, useSkeletonDelay } from '../components/Skeleton';
import Animated from 'react-native-reanimated';
import useFilterEntrance from '../hooks/useFilterEntrance';
import useDiscoverPages from '../hooks/useDiscoverPages';
import usePlusGate from '../hooks/usePlusGate';
import useLayout from '../hooks/useLayout';

// § 10e — "See all" for buckets: a 2-column grid of BucketTiles (9c).
//
//   variant 'mine'     My Books › My buckets. Sort: Updated (default) / A–Z /
//                      Progress. "+" in the header replaces the dashed "New
//                      bucket" tile. Long-press a tile to rename it, reorder
//                      its books, or delete it. Copies saved from Discover
//                      keep the warm ground plus a sparkle.
//   variant 'curated'  Discover › Curated buckets. The genre chips (keeping
//                      8a's), ranked by relevance as the server returns them.
//
// On iPad (14e) the grid gains columns (3 in the portrait layout, 4 in
// landscape) with a bigger fan, and My buckets ends with the dashed "New
// bucket" tile; the header's + does the same thing.
const GUTTER = 24;
const GAP = 12;
const GAP_LARGE = 20;
const NEW_TILE = '__new';

const SORTS = [
  { value: 'updated', label: 'Updated', icon: 'time-outline' },
  { value: 'name', label: 'A–Z', icon: 'text-outline' },
  { value: 'progress', label: 'Progress', icon: 'pie-chart-outline' },
];

const progressOf = (b) => (b.bookCount > 0 ? b.finishedCount / b.bookCount : 0);

const sortBuckets = (buckets, sort) => {
  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  if (sort === 'name') {
    return [...buckets].sort(byName);
  }
  if (sort === 'progress') {
    return [...buckets].sort((a, b) => progressOf(b) - progressOf(a) || byName(a, b));
  }
  return [...buckets].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
};

const BucketGridScreen = () => {
  const navigation = useNavigation();
  const gate = usePlusGate();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const variant = route.params?.variant || 'mine';
  const { isLarge, pagePad, columns } = useLayout();
  const cols = columns(2, 3, 4);
  const gutter = isLarge ? pagePad : GUTTER;
  const gap = isLarge ? GAP_LARGE : GAP;
  const tileWidth = (width - gutter * 2 - gap * (cols - 1)) / cols;

  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const deleteBucket = useBucketsStore((s) => s.deleteBucket);
  const [sort, setSort] = useState('updated');

  // Curated: Discover's buckets for the chip, as on Discover.
  const [genre, setGenre] = useState(route.params?.genre || null);
  const { page, genres, failed } = useDiscoverPages(genre, { enabled: variant === 'curated' });
  const enteringFor = useFilterEntrance(genre);

  // A bucket renamed, filled or emptied on 9a has to show here on return.
  useFocusEffect(
    useCallback(() => {
      if (variant === 'mine') {
        fetchCustomBuckets();
      }
    }, [variant, fetchCustomBuckets]),
  );

  const buckets = useMemo(
    () => (variant === 'mine' ? sortBuckets(customBuckets, sort) : page?.curated || []),
    [variant, customBuckets, sort, page],
  );
  const loaded = variant === 'mine' || page !== undefined;
  const showSkeleton = useSkeletonDelay(!loaded && !failed);

  // ── Mine: long-press menu ─────────────────────────────────────────────
  const [renaming, setRenaming] = useState(null);
  const rename = (bucket) => setRenaming(bucket);

  const confirmDelete = (bucket) => {
    Alert.alert(
      `Delete "${bucket.name}"?`,
      'The books stay in your library, and your progress in them is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBucket(bucket.id) },
      ],
    );
  };

  const reorder = (bucket) => {
    navigation.navigate('MyBucket', { bucketId: bucket.id, name: bucket.name, editing: true });
  };

  const openMenu = (bucket) => {
    Alert.alert(
      bucket.name,
      undefined,
      [
        { text: 'Rename', onPress: () => rename(bucket) },
        { text: 'Reorder books', onPress: () => reorder(bucket) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(bucket) },
        ...(Platform.OS === 'ios' ? [{ text: 'Cancel', style: 'cancel' }] : []),
      ],
      { cancelable: true },
    );
  };

  // ── Header ────────────────────────────────────────────────────────────
  const savedCount = customBuckets.filter((b) => b.sourceCuratedId).length;
  const count = `${buckets.length} bucket${buckets.length === 1 ? '' : 's'}`;
  const subtitle = variant === 'mine'
    ? (savedCount > 0 ? `${count} · ${savedCount} saved from Discover` : count)
    : (loaded ? count : null);

  const newBucket = () => gate('buckets', () => navigation.navigate('CreateBucketScreen'));

  const renderTile = ({ item: bucket, index }) => {
    if (bucket.id === NEW_TILE) {
      return <NewBucketTile width={tileWidth} onPress={newBucket} />;
    }
    return renderBucket({ item: bucket, index });
  };

  const renderBucket = ({ item: bucket, index }) => (variant === 'mine' ? (
    <BucketTile
      large={isLarge}
      variant="mine"
      progressKey={`bucket:${bucket.id}`}
      width={tileWidth}
      covers={bucket.booksPreview}
      name={bucket.name}
      bookCount={bucket.bookCount}
      finishedCount={bucket.finishedCount}
      saved={!!bucket.sourceCuratedId}
      onPress={() => navigation.navigate('MyBucket', { bucketId: bucket.id, name: bucket.name })}
      onLongPress={() => openMenu(bucket)}
    />
  ) : (
    <Animated.View entering={enteringFor(index)}>
      <BucketTile
        large={isLarge}
        variant="curated"
        width={tileWidth}
        covers={bucket.booksPreview}
        name={bucket.name}
        meta={curatedMeta(bucket, genre)}
        onPress={() => navigation.navigate('CuratedBucket', { bucketId: bucket.id, name: bucket.name, genre })}
      />
    </Animated.View>
  ));

  const empty = () => {
    if (!failed && !loaded) {
      return showSkeleton ? (
        <View style={[styles.skeleton, { columnGap: gap }]}>
          {Array.from({ length: cols * 2 }, (_, i) => (
            <Bone key={i} width={tileWidth} height={isLarge ? 196 : 150} radius={22} />
          ))}
        </View>
      ) : null;
    }
    let icon = 'albums-outline';
    let text = variant === 'mine' ? 'No buckets yet. Tap + to make one.' : 'No curated buckets here yet.';
    if (failed) {
      icon = 'cloud-offline-outline';
      text = 'Couldn\'t load buckets.';
    }
    return (
      <View style={styles.message}>
        <Icon name={icon} size={30} color={DS.colors.onSurfaceVariant} />
        {text ? <Text style={styles.messageText}>{text}</Text> : null}
      </View>
    );
  };

  // Only once there's a grid to end: at 0 buckets the empty message says to
  // tap +, as on the phone.
  const showNewTile = isLarge && variant === 'mine' && buckets.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SeeAllHeader
        title={variant === 'mine' ? 'My buckets' : 'Curated buckets'}
        subtitle={subtitle}
        sort={variant === 'mine' ? { options: SORTS, value: sort, onChange: setSort } : null}
        onAdd={variant === 'mine' ? newBucket : null}
        addLabel="New bucket"
      />
      <FlatList
        // numColumns can't change on a mounted list; a new layout remounts it.
        key={`grid-${cols}`}
        data={showNewTile ? [...buckets, { id: NEW_TILE }] : buckets}
        // Keyed by genre too, so a chip change remounts the tiles and they rise in.
        keyExtractor={(bucket) => `${genre || ''}:${bucket.id}`}
        renderItem={renderTile}
        numColumns={cols}
        columnWrapperStyle={[styles.row, { gap }]}
        ListHeaderComponent={variant === 'curated' && genres.length > 0 ? (
          <View style={{ marginHorizontal: -gutter }}>
            <GenreChips genres={genres} value={genre} onChange={setGenre} gutter={gutter} />
          </View>
        ) : <View style={styles.headerGap} />}
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      />
      <RenameBucketSheet bucket={renaming} onClose={() => setRenaming(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  // Stands in for the 2-column curated tiles (BucketTile's 150pt height).
  skeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
  },
  headerGap: {
    height: 20,
  },
  row: {
    marginBottom: 20,
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

export default BucketGridScreen;
