import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation, CommonActions  } from "@react-navigation/native";
import { loginStyles } from "../styles/global";
import Background from "../components/Background";
import { signOutButton as SignOutButton } from "../components/Button";
import { storage } from "../utils/storage";
import log from "../utils/logger";

const Profile = ({ route }) => {
  const navigation = useNavigation();

  const { username } = route.params;
  log.info(`Profile screen loaded for user: ${username}`);

  const handleSignOut = async () => {
    log.info("Signing out...");
    // Clear the token from storage
    const userStorage = storage("user_storage");
    userStorage.clearAll();

    // Navigate to the login screen
    navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "Login" }],
    }));
  };
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <SignOutButton onPress={handleSignOut} />,
    });
  }, [navigation]);

  return (
    <Background>
      <View style={loginStyles.container}>
        <Text style={styles.welcome}>
          Welcome to the Profile Screen, {username}!
        </Text>
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export default Profile;
