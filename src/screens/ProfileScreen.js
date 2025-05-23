import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginStyles } from "../styles/global";
import Background from "../components/Background";
import {SignOutButton} from "../components/Button";

const Profile = ({ route }) => {
  const navigation = useNavigation();

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
        <SignOutButton onPress = {handleSignOut}/>
      ),
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