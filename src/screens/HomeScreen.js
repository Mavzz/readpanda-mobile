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
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { newBookCard as BookCard } from '../components/Card';
import { useState, useEffect, useCallback } from 'react';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toaster';
import { DS } from '../styles/global';
import useBooksStore from '../stores/booksStore';

const { width, height } = Dimensions.get('window');

const Home = ({ navigation }) => {
  const { user } = useAuth();
  const filteredBooks = useBooksStore((s) => s.filteredBooks);
  const loading = useBooksStore((s) => s.loading);
  const refreshing = useBooksStore((s) => s.refreshing);
  const fetchBooks = useBooksStore((s) => s.fetchBooks);
  const filterBooks = useBooksStore((s) => s.filterBooks);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const username = user?.username || 'Reader';

  const openBook = (book) => {
    log.info(`Opening book: ${book.title}`);
    navigation.navigate('ManuscriptScreen', { book });
  };

  const renderBook = ({ item }) => (
    <BookCard
      book={item}
      onPress={() => openBook(item)}
    />
  );

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

  const handleSearch = (searchResults) => {
    filterBooks(searchResults);
  };

  useEffect(() => {
    if (!user) {
      log.info('No user found, skipping book fetch');
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
        {/* Library Section */}
        <View style={styles.librarySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Library</Text>
            <Text style={styles.bookCount}>{filteredBooks.length} books</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBooks}>
              <Icon name="hourglass-outline" size={32} color={DS.colors.onSurfaceVariant} />
              <Text style={styles.loadingBooksText}>Loading your books...</Text>
            </View>
          ) : filteredBooks.length > 0 ? (
            <FlatList
              data={filteredBooks}
              keyExtractor={(item) => item.book_id?.toString()}
              renderItem={renderBook}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.booksGrid}
              columnWrapperStyle={styles.bookRow}
            />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="library-outline" size={64} color={DS.colors.onSurfaceVariant} />
              <Text style={styles.emptyStateTitle}>No books loaded yet</Text>
            </View>
          )}
        </View>
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

  // Library Section
  librarySection: {
    padding: 20,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  bookCount: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
  },

  // Books Grid
  booksGrid: {
    paddingBottom: 20,
  },
  bookRow: {
    justifyContent: 'space-between',
    gap: 12,
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

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
  },
});

export default Home;