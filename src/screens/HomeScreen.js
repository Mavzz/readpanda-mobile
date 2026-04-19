import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useState, useEffect, useCallback, useRef } from 'react';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toaster';
import { DS } from '../styles/global';
import useBooksStore from '../stores/booksStore';
import useBucketsStore, { PREDEFINED_BUCKETS } from '../stores/bucketsStore';

const Home = ({ navigation }) => {
  const { user } = useAuth();
  const books = useBooksStore((s) => s.books);
  const loading = useBooksStore((s) => s.loading);
  const refreshing = useBooksStore((s) => s.refreshing);
  const fetchBooks = useBooksStore((s) => s.fetchBooks);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const deleteBucket = useBucketsStore((s) => s.deleteBucket);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const didInit = useRef(false);

  const username = user?.username || 'Reader';

  const openBucket = (name, bucketBooks, icon) => {
    navigation.navigate('BucketBooksScreen', { name, books: bucketBooks, icon });
  };

  const loadBooks = async (showRefresh = false) => {
    const { status } = await fetchBooks(showRefresh);
    if (showRefresh && status === 200) {
      showToast('Library refreshed successfully! 📚', 'success');
    } else if (status !== 200 && status !== null) {
      showToast('Connection error. Please try again.', 'error');
    }
  };

  const onRefresh = useCallback(() => {
    showToast('Refreshing your library...', 'info');
    loadBooks(true);
  }, []);

  const handleDeleteBucket = (bucket) => {
    Alert.alert(
      'Delete Bucket',
      `Delete "${bucket.name}"? This won't remove the books from your library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBucket(bucket.id) },
      ],
    );
  };

  useEffect(() => {
    if (!user || didInit.current) {
      log.info('No user found or already initialized, skipping book fetch');
      return;
    }

    if (!hasShownWelcome) {
      log.info('Showing welcome back toast');
      setTimeout(() => {
        showToast(`Welcome back, ${username}! 👋`, 'success', 4000);
        setHasShownWelcome(true);
      }, 500);
    }

    if (user.isNewUser) {
      log.info('Navigating new user to InterestScreen');
      navigation.navigate('Interest');
    } else {
      log.info('Existing user, fetching books');
      loadBooks();
    }
    didInit.current = true;
  }, [user, hasShownWelcome]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <View style={styles.loadingContainer}>
          <Icon name="book" size={48} color={DS.colors.primary} />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ourPickBuckets = PREDEFINED_BUCKETS
    .map((bucket) => ({
      ...bucket,
      books: bucket.filter(books),
    }))
    .filter((bucket) => bucket.books.length > 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      >
        {/* ── My Buckets ─────────────────────────────────────── */}
        <View style={styles.section}>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Buckets</Text>
          </View>

          <TouchableOpacity
            style={styles.createBucketCard}
            onPress={() => navigation.navigate('CreateBucketScreen')}
          >
            <Icon name="add-circle-outline" size={24} color={DS.colors.primary} />
            <Text style={styles.createBucketText}>Create a new bucket</Text>
          </TouchableOpacity>

          {customBuckets.length > 0 && (
            <FlatList
              data={customBuckets}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => {
                const bucketBooks = books.filter((b) =>
                  item.bookIds.includes(b.book_id),
                );
                const coverUrl = bucketBooks[0]?.cover_image_url;
                return (
                  <TouchableOpacity
                    style={styles.bucketCard}
                    onPress={() => openBucket(item.name, bucketBooks)}
                    onLongPress={() => handleDeleteBucket(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.bucketCardCover}>
                      {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.bucketCoverImage} />
                      ) : (
                        <Icon name="folder" size={48} color={DS.colors.primary} />
                      )}
                    </View>
                    <Text style={styles.bucketCardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.bucketCardCount}>{bucketBooks.length} books</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* ── Our Picks (Vertical) ───────────────────────────── */}
        {ourPickBuckets.length > 0 && (
          <View style={styles.genreSection}>
            <View style={styles.genreHeader}>
              <Text style={styles.genreTitle}>Curated Picks</Text>
              <Text style={styles.seeAllText}>See All ({ourPickBuckets.length})</Text>
            </View>
            <FlatList
              data={ourPickBuckets}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.ourPicksRow}
              contentContainerStyle={styles.ourPicksList}
              renderItem={({ item }) => {
                const coverUrl = item.books[0]?.cover_image_url;
                return (
                  <TouchableOpacity
                    style={styles.pickCard}
                    onPress={() => openBucket(item.name, item.books, item.icon)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.pickCardCover}>
                      {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.pickCoverImage} />
                      ) : (
                        <Icon name="sparkles-outline" size={40} color={DS.colors.primary} />
                      )}
                    </View>
                    <Text style={styles.pickCardName} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {loading && (
          <View style={styles.loadingBooks}>
            <Icon name="hourglass-outline" size={32} color={DS.colors.onSurfaceVariant} />
            <Text style={styles.loadingBooksText}>Loading your books...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },

  // Generic section wrapper
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },

  // My Buckets — card style matching book cards
  bucketCard: {
    width: 160,
    height: 260,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.xl,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 3,
  },
  bucketCardCover: {
    width: 136,
    height: 170,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bucketCoverImage: {
    width: '100%',
    height: '100%',
    borderRadius: DS.radius.lg,
  },
  bucketCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.onSurface,
    textAlign: 'center',
  },
  bucketCardCount: {
    fontSize: 13,
    fontWeight: '500',
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
  },
  createBucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.sm,
    borderWidth: 1,
    borderColor: DS.colors.outlineVariant,
    borderStyle: 'dashed',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 14,
  },
  createBucketText: {
    fontSize: 14,
    fontWeight: '500',
    color: DS.colors.onSurfaceVariant,
  },

  // Genre / Predefined sections
  genreSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  genreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  genreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DS.colors.primary,
  },
  seeAllText: {
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  ourPicksList: {
    paddingBottom: 8,
  },
  ourPicksRow: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pickCard: {
    width: '48%',
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.xl,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pickCardCover: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  pickCoverImage: {
    width: '100%',
    height: '100%',
  },
  pickCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.colors.onSurface,
    textAlign: 'center',
    width: '100%',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
  },
  loadingBooks: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingBooksText: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    marginTop: 12,
  },
});

export default Home;