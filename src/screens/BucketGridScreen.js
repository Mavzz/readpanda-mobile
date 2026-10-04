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
import BucketTile from '../components/BucketTile';
import GenreChips from '../components/GenreChips';
import SeeAllHeader from '../components/SeeAllHeader';
import { showToast } from '../components/Toaster';
import useBucketsStore from '../stores/bucketsStore';
import { curatedMeta } from '../utils/readingTime';
import { Bone, useSkeletonDelay } from '../components/Skeleton';
import Animated from 'react-native-reanimated';
import useFilterEntrance from '../hooks/useFilterEntrance';
import useDiscoverPages from '../hooks/useDiscoverPages';
import usePlusGate from '../hooks/usePlusGate';

// § 10e — "See all" for buckets: a 2-column grid of BucketTiles (9c).
//
//   variant 'mine'     My Books › My buckets. Sort: Updated (default) / A–Z /
//                      Progress. "+" in the header replaces the dashed "New
//                      bucket" tile. Long-press a tile to rename it, reorder
//                      its books, or delete it. Copies saved from Discover
//                      keep the warm ground plus a sparkle.
//   variant 'curated'  Discover › Curated buckets. The genre chips (keeping
//                      8a's), ranked by relevance as the server returns them.
const GUTTER = 24;
const GAP = 12;

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
  const tileWidth = (width - GUTTER * 2 - GAP) / 2;

  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const renameBucket = useBucketsStore((s) => s.renameBucket);
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
  const rename = (bucket) => {
    if (Platform.OS !== 'ios') {
      showToast('Renaming is coming soon', 'info');
      return;
    }
    Alert.prompt('Rename bucket', undefined, (value) => {
      const next = (value || '').trim();
      if (next && next !== bucket.name) {
        renameBucket(bucket.id, next);
      }
    }, 'plain-text', bucket.name);
  };

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

  const renderTile = ({ item: bucket, index }) => (variant === 'mine' ? (
    <BucketTile
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
        <View style={styles.skeleton}>
          {[0, 1, 2, 3].map((i) => <Bone key={i} width={tileWidth} height={150} radius={22} />)}
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SeeAllHeader
        title={variant === 'mine' ? 'My buckets' : 'Curated buckets'}
        subtitle={subtitle}
        sort={variant === 'mine' ? { options: SORTS, value: sort, onChange: setSort } : null}
        onAdd={variant === 'mine' ? () => gate('buckets', () => navigation.navigate('CreateBucketScreen')) : null}
        addLabel="New bucket"
      />
      <FlatList
        data={buckets}
        // Keyed by genre too, so a chip change remounts the tiles and they rise in.
        keyExtractor={(bucket) => `${genre || ''}:${bucket.id}`}
        renderItem={renderTile}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={variant === 'curated' && genres.length > 0 ? (
          <View style={styles.chipsBleed}>
            <GenreChips genres={genres} value={genre} onChange={setGenre} />
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
  chipsBleed: {
    marginHorizontal: -GUTTER,
  },
  // Stands in for the 2-column curated tiles (BucketTile's 150pt height).
  skeleton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GAP,
    rowGap: 20,
  },
  headerGap: {
    height: 20,
  },
  row: {
    gap: GAP,
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
