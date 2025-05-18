import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

const Home = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { username } = route.params;

  const books = [
    { id: '1', title: 'Book One' },
    { id: '2', title: 'Book Two' },
    { id: '3', title: 'Book Three' },
  ];

  const openBook = (book) => {
    //navigation.navigate('BookScreen', { book });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Welcome to the Home Screen, {username}!
      </Text>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openBook(item)}>
            <Text style={styles.bookItem}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
  },
  bookItem: {
    fontSize: 18,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default Home;
