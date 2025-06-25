import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Background from "../components/Background";
import { bookCard as BookCard } from '../components/Card';
import { loginStyles } from "../styles/global";
import { storage } from "../utils/storage";
import { useGet } from "../services/useGet";
import { getBackendUrl } from "../utils/Helper";
import { useState, useEffect } from "react";
import ManuscriptScreen from "./ManuscriptScreen";

const Home = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { username } = route.params;

  const [books, setBooks] = useState([]);

  const openBook = (book) => {
    navigation.navigate('ManuscriptScreen', { book });
  };

  const renderCategory = ({ item }) => (
    <BookCard book={item} onPress={() => openBook(item)} />
  );


  const fetchBooks = async () => {
      
    const userStorage = storage("user_storage");
    const userToken = userStorage.getString("token");

    if (!userToken) {
      console.error("No user token found. Please log in.");
      return;
    }

    try {
      const { status, response } = await useGet(
        await getBackendUrl("/allbooks"),
        {
          Authorization: `Bearer ${userToken}`,
        }
      );

      if (status === 200) {
        console.log("Books fetched successfully:", response);
        // Assuming response is an array of books
        setBooks(response.books);
      } else {
        console.error("Failed to fetch books:", response);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    }
    
  };

  useEffect(() => {
    fetchBooks();
  }, []);


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