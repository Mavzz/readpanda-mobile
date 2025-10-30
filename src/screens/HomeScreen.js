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
} from "react-native";
import Icon from 'react-native-vector-icons/Ionicons';
import { newBookCard as BookCard } from '../components/Card';
import { getRequest } from "../services/useGet";
import { getBackendUrl } from "../utils/Helper";
import { useState, useEffect, useCallback } from "react";
import log from "../utils/logger";
import enhanceedStorage from '../utils/enhanceedStorage';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from "../components/Toaster";
import { MyTheme } from '../styles/global';
import { fetchManuscripts } from '../services/bookService';

const { width, height } = Dimensions.get('window');

const Home = ({ navigation }) => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  const username = user?.username || 'Reader';

  const openBook = (book) => {
    log.info(`Opening book: ${book.title}`);
    navigation.navigate('ManuscriptScreen', { book });
  };

  const renderBook = ({ item, index }) => (
    <BookCard
      book={item}
      onPress={() => openBook(item)}
    />
  );

  const fetchBooks = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    log.info("Fetching books");
    const userToken = enhanceedStorage.getAuthToken();

    try {
      const { status, response } = await fetchManuscripts(userToken);

      if (status === 200) {
        log.info("Books fetched successfully:", response);
        const booksData = response.books || [];
        setBooks(booksData);
        setFilteredBooks(booksData);

        if (showRefresh) {
          showToast("Library refreshed successfully! 📚", 'success');
        }
      } else {
        log.error("Failed to fetch books:", response);
      }
    } catch (error) {
      log.error("Error fetching books:", error);
      showToast("Connection error. Please try again.", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    showToast("Refreshing your library...", 'info');
    fetchBooks(true);
  }, []);

  const handleSearch = (searchResults) => {
    setFilteredBooks(searchResults);
  };

  useEffect(() => {
    if (!user) {
      log.info("No user found, skipping book fetch");
      return;
    }

    // Show welcome toast only once
    if (!hasShownWelcome) {
      log.info("Showing welcome back toast");
      setTimeout(() => {
        showToast(`Welcome back, ${username}! 👋`, 'success', 4000);
        setHasShownWelcome(true);
      }, 500);
    }

    if (user.isNewUser) {
      log.info("Navigating new user to InterestScreen");
      navigation.navigate("Interest");
    } else {
      log.info("Existing user, fetching books");
      fetchBooks();
    }
  }, [user, hasShownWelcome]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="book" size={48} color="#667eea" />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={MyTheme.colors.card} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[MyTheme.colors.primary]} />
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
              <Icon name="hourglass-outline" size={32} color="#ccc" />
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
              <Icon name="library-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No books loaded yet!!!!</Text>
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },

  // Welcome Section
  welcomeSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
  },

  // Library Section
  librarySection: {
    backgroundColor: MyTheme.colors.card,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: MyTheme.colors.text,
  },
  bookCount: {
    fontSize: 14,
    color: '#666',
  },

  // Books Grid
  booksGrid: {
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  bookRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bookCover: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  bookAuthor: {
    fontSize: 12,
    color: '#666',
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingBooks: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingBooksText: {
    fontSize: 14,
    color: '#999',
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
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  addBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
    backgroundColor: '#fff',
  },
  addBookButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Home;