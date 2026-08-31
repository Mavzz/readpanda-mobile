import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';

const BUCKET_ICONS = [
  { name: 'library', color: '#ffddb8' },
  { name: 'bookmark', color: '#e8c49a' },
  { name: 'reader', color: '#ffb95f' },
  { name: 'book', color: '#ffddb8' },
  { name: 'albums', color: '#e8c49a' },
  { name: 'layers', color: '#ffb95f' },
];

const getBucketIcon = (index) => BUCKET_ICONS[index % BUCKET_ICONS.length];

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
          renderItem={({ item, index }) => {
            const icon = getBucketIcon(index);
            return (
              <TouchableOpacity
                style={styles.bucketCard}
                onPress={() => openBucket(item)}
                activeOpacity={0.85}
              >
                <View style={styles.topRow}>
                  <View style={styles.iconContainer}>
                    <Icon name={icon.name} size={28} color={icon.color} />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteBucket(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="trash-outline" size={18} color={DS.colors.error} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.bucketCardName} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={styles.memberInfo}>
                  <Icon name="book-outline" size={14} color={DS.colors.onSurfaceVariant} />
                  <Text style={styles.memberCount}>{item.bookCount || 0} {item.bookCount === 1 ? 'book' : 'books'}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
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
    fontWeight: '700',
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
    width: 160,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.lg,
    padding: 20,
    marginRight: 16,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 160,
    borderWidth: 1,
    borderColor: DS.colors.surfaceContainerHighest,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 4,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bucketCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.colors.onSurface,
    marginBottom: 12,
    lineHeight: 22,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberCount: {
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    fontWeight: '600',
  },

  // Create bucket CTA
  createBucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    borderWidth: 1,
    borderColor: DS.colors.outlineVariant + '26', // ghost border @ 15%
    borderStyle: 'dashed',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 24,
  },
  createBucketText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.colors.onSurfaceVariant,
  },
});

export default UserBuckets;