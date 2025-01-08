import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {  useRoute } from "@react-navigation/native";

const Home = () => {
  const route = useRoute();
  const { username } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Welcome to the Home Screen, {username}!
      </Text>
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
});

export default Home;
