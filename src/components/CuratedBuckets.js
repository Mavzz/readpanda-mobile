import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';

const BUCKET_ICONS = [
  { name: 'sparkles', color: '#ffddb8' },
  { name: 'diamond', color: '#e8c49a' },
  { name: 'star', color: '#ffb95f' },
  { name: 'trophy', color: '#ffddb8' },
  { name: 'ribbon', color: '#e8c49a' },
  { name: 'flame', color: '#ffb95f' },
];

const getBucketIcon = (index) => BUCKET_ICONS[index % BUCKET_ICONS.length];

const CuratedBuckets = ({ navigation, curatedBuckets }) => {

  const openBucket = (booksPreview, name, bookCount) => {
    navigation.navigate('BucketBooksScreen', {
      books_preview: booksPreview,
      name,
      book_count: bookCount,
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Curated Picks</Text>
        <Text style={styles.seeAllText}>See All ({curatedBuckets.length})</Text>
      </View>
      <FlatList
        data={curatedBuckets}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const icon = getBucketIcon(index);
          return (
            <TouchableOpacity
              style={styles.bucketCard}
              onPress={() => openBucket(item.booksPreview, item.name, item.bookCount)}
              activeOpacity={0.85}
            >
              <View style={styles.iconContainer}>
                <Icon name={icon.name} size={28} color={icon.color} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
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
  seeAllText: {
    fontSize: 14,
    color: DS.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    gap: 16,
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
});

export default CuratedBuckets;