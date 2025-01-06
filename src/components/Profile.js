import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Profile = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { username } = route.params;

    const handleSignOut = async () => {
      const isTokenExists = await AsyncStorage.getItem(`token_${username}`);
      if (isTokenExists) {
        await AsyncStorage.removeItem(username);
      }
      navigation.popTo("Login");
    };
    React.useLayoutEffect(() => {
      navigation.setOptions({
        headerRight: () => (
          <Button onPress={handleSignOut} title="Sign Out" color="#000" />
        ),
      });
    }, [navigation]);

  return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to the Profile Screen, {username}!
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

export default Profile;