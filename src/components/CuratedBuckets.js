import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { DS } from '../styles/global';
import BookCoverGradient from './BookCoverGradient';

// Curated collection tiles: the collection's best-known cover, full-bleed,
// with a bottom scrim so the label reads over it (FIRST_RUN_3a_3b.md
// § "Curated/genre tiles"). No decorative icons — the cover is the artwork.
const TILE_WIDTH = 150;
const TILE_HEIGHT = 196;

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
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openBucket(item.booksPreview, item.name, item.bookCount)}
            activeOpacity={0.85}
          >
            <BookCoverGradient
              coverUrl={item.coverImageUrl || item.booksPreview?.[0]?.cover_image_url}
              title={item.name}
              width={TILE_WIDTH}
              height={TILE_HEIGHT}
              borderRadius={DS.radius.md}
              titleFontSize={14}
              elevated
              scrim
            >
              <View style={styles.label}>
                <Text style={styles.bucketCardName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.bookCount}>
                  {item.bookCount || 0} {item.bookCount === 1 ? 'book' : 'books'}
                </Text>
              </View>
            </BookCoverGradient>
          </TouchableOpacity>
        )}
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
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.primary,
  },
  listContent: {
    paddingHorizontal: 24,
    gap: 16,
    paddingVertical: 4,
  },
  label: {
    padding: 12,
  },
  bucketCardName: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    lineHeight: 19,
  },
  bookCount: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
});

export default CuratedBuckets;
