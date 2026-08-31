import { View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import log from '../utils/logger';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';

const NUM_COLUMNS = 2;

/* ── Book Card (matches CreateBucketScreen style) ─────────────────────────── */
const BucketBookCard = ({ book, onPress, onRemove, showRemove }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const coverUrl = book?.cover_image_url;

  return (
    <Animated.View style={[styles.bookCard, containerAnimStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(book)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.bookCardInner}
      >
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.placeholderEmoji}>📚</Text>
              <Text style={styles.placeholderTitle} numberOfLines={2}>
                {book?.title || 'Book'}
              </Text>
            </View>
          )}
          {showRemove && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemove(book.book_id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={24} color={DS.colors.error} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.bookTitle} numberOfLines={2}>
          {book?.title || 'Untitled'}
        </Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>
          {book?.author_name || 'Unknown Author'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ── Screen ───────────────────────────────────────────────────────────────── */
const BucketBooksScreen = ({ route, navigation }) => {
  const { books_preview, name, book_count, bucket_id, isCustom } = route.params;
  const [books, setBooks] = useState(books_preview || []);
  const [bookCount, setBookCount] = useState(book_count || 0);
  const removeBookFromBucket = useBucketsStore(state => state.removeBookFromBucket);

  const handleRemoveBook = (bookId) => {
    setBooks(prev => prev.filter(b => b.book_id !== bookId));
    setBookCount(prev => Math.max(0, prev - 1));
    if (isCustom && bucket_id) {
      removeBookFromBucket(bucket_id, bookId);
    }
  };

  const openBook = (book) => {
    log.info(`Opening book: ${book.title}`);
    navigation.navigate('ManuscriptScreen', { book });
  };

  const renderBook = ({ item }) => (
    <BucketBookCard 
      book={item} 
      onPress={openBook} 
      onRemove={handleRemoveBook}
      showRemove={isCustom}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={DS.colors.onSurfaceVariant} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {name}
        </Text>
        <Text style={styles.bookCount}>{bookCount} books</Text>
      </View>

      {books.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="book-outline" size={48} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No books yet</Text>
          <Text style={styles.emptySubtitle}>Add books to this bucket from the library.</Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item, index) => item.book_id?.toString() ?? `book-${index}`}
          renderItem={renderBook}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.onSurface,
    flex: 1,
  },
  bookCount: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  // Book card — same as CreateBucketScreen
  bookCard: {
    flex: 1,
    maxWidth: '48%',
    borderRadius: DS.radius.sm,
    overflow: 'hidden',
    backgroundColor: DS.colors.surfaceContainerLow,
  },
  bookCardInner: {
    padding: 10,
  },
  coverContainer: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: DS.radius.sm - 2,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  placeholderEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  placeholderTitle: {
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DS.colors.onSurface,
    textAlign: 'center',
    lineHeight: 17,
  },
  bookAuthor: {
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default BucketBooksScreen;
