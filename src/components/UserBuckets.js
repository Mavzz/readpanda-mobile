import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';
import BucketTile from './BucketTile';

// Bucket tiles are composited from the covers the bucket holds — see
// BucketTile and FIRST_RUN_3a_3b.md § "Tile imagery". The decorative icon
// per card this used to draw is gone: covers carry the visual interest.
const TILE_WIDTH = 160;
const TILE_HEIGHT = 148;

const UserBuckets = ({ navigation, customBuckets }) => {
  const deleteBucket = useBucketsStore((state) => state.deleteBucket);

  const handleDeleteBucket = (bucket) => {
    Alert.alert(
      'Delete Bucket',
      `Delete "${bucket.name}"? This won't remove the books from your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBucket(bucket.id),
        },
      ],
    );
  };

  const openBucket = (bucket) => {
    navigation.navigate('BucketBooksScreen', {
      books_preview: bucket.booksPreview,
      name: bucket.name,
      book_count: bucket.bookCount,
      bucket_id: bucket.id,
      isCustom: true,
    });
  };

  return (
    <View style={styles.section}>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Buckets</Text>
      </View>

      <TouchableOpacity
        style={styles.createBucketCard}
        onPress={() => navigation.navigate('CreateBucketScreen')}
      >
        <Icon name="add-circle-outline" size={24} color={DS.colors.primary} />
        <Text style={styles.createBucketText}>Create your own bucket</Text>
      </TouchableOpacity>

      {customBuckets.length > 0 && (
        <FlatList
          data={customBuckets}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bucketCard}
              onPress={() => openBucket(item)}
              activeOpacity={0.85}
            >
              <View style={styles.tileWrap}>
                <BucketTile
                  books={item.booksPreview}
                  bookCount={item.bookCount}
                  name={item.name}
                  width={TILE_WIDTH}
                  height={TILE_HEIGHT}
                  borderRadius={DS.radius.sm + 4}
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteBucket(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Icon name="trash-outline" size={16} color={DS.colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.bucketCardName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.memberCount}>
                {item.bookCount || 0} {item.bookCount === 1 ? 'book' : 'books'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Generic section wrapper
  section: {
    paddingTop: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 24,
    gap: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Bucket card
  bucketCard: {
    // The tile is TILE_WIDTH wide and the card pads 12 around it.
    width: TILE_WIDTH + 24,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 12,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 4,
  },
  tileWrap: {
    marginBottom: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.colors.surfaceContainerLowest + 'CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bucketCardName: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    lineHeight: 19,
  },
  memberCount: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Create bucket CTA
  createBucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 24,
  },
  createBucketText: {
    fontSize: 15,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default UserBuckets;
