import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import Background from "../components/Background";
import { bookCard as BookCard } from '../components/Card';
import { loginStyles } from "../styles/global";
import { useGet } from "../services/useGet";
import { getBackendUrl } from "../utils/Helper";
import { useState, useEffect } from "react";
import log from "../utils/logger";
import enhanceedStorage from '../utils/enhanceedStorage';
import { useAuth } from '../contexts/AuthContext';

const Home = ({ navigation }) => {
  const { user } = useAuth();
  log.info("Home screen user data:", user);
  const username = user?.username;
  log.info(`Home screen loaded for user: ${username}`);

  const [books, setBooks] = useState([]);

  const openBook = (book) => {
    log.info(`Opening book: ${book.title}`);
    navigation.navigate('ManuscriptScreen', { book });
  };

  const renderCategory = ({ item }) => (
    <BookCard book={item} onPress={() => openBook(item)} />
  );


  const fetchBooks = async () => {
    log.info("Fetching books");
    const userToken = enhanceedStorage.getAuthToken();

    if (!userToken) {
      log.error("No user token found. Please log in.");
      return;
    }

    try {
      const { status, response } = await useGet(
        await getBackendUrl("/books/all"),
        {
          Authorization: `Bearer ${userToken}`,
        }
      );

      if (status === 200) {
        log.info("Books fetched successfully:", response);
        // Assuming response is an array of books
        setBooks(response.books);
      } else {
        log.error("Failed to fetch books:", response);
      }
    } catch (error) {
      log.error("Error fetching books:", error);
    }

  };

  useEffect(() => {

    if (!user) {
      log.info("No user found, skipping book fetch");
      return;
    }

    if (user.isNewUser) {
      log.info("Navigating new user to InterestScreen");
      navigation.navigate("Interest");
    } else {
      log.info("Existing user, fetching books");
      fetchBooks();
    }
  }, [user]);

  // Show loading or empty state when user is null
  if (!user) {
    return (
      <Background>
        <View style={loginStyles.container}>
          <Text style={styles.welcome}>Loading...</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <View style={loginStyles.container}>
        <Text style={styles.welcome}>
          Welcome to the Home Screen, {username}!
        </Text>
        <FlatList
          data={books}
          keyExtractor={(item) => item.book_id}
          renderItem={renderCategory}
          numColumns={3}
        />
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
  },
  bookItem: {
    fontSize: 18,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
});

export default Home;