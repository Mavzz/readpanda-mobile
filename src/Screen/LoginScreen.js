import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import encryptedPassword from "../utils/Helper";
import { API_URL} from "@env";

const Login = ({ navigation }) => {

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const storeData = async (value, username) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(`token_${username}`, jsonValue);
    } catch (e) {
      // Error occurred while saving data to AsyncStorage
      Alert.alert("Login failed", "Invalid username or password");
    }
  };

  const handleLogin = async () => {
    // Attempt to log in with the provided username and password
    try {

      if (!API_URL) {
        Alert.alert("Login failed", "API URL is not defined. Please try again later.");
        return;
      }

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password: encryptedPassword(password) }),
      });

      console.log(`Login response status: ${response.status}`);
      if (response.status === 200) {

        const data = await response.json();
        await storeData(data.token, username);
        
        navigation.popTo("Root", { username });

      } else if (response.status === 401) {
        console.log(
          `Login failed for user: ${username} due to invalid credentials`
        );
        Alert.alert("Login failed", "Invalid username or password");
      }
    } catch (error) {
      Alert.alert("Login failed", "An error occurred. Please try again.");
      console.log(`Login error for user ${username}:`, error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
      />
      <View style={styles.buttonContainer}>
        <Button title="Login" onPress={handleLogin} />
        <Button title="SignUp" onPress={() => navigation.navigate("SignUp")} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginTop: 20,
  },
});

export default Login;
