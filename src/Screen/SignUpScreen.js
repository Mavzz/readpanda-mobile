import React, { useState } from "react";
import encryptedPassword from "../utils/Helper";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { API_URL } from "@env";

const SignUp = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignUp = async () => {
    try{
    if (!username || !password || !confirmPassword) {
      Alert.alert("Sign Up failed", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Sign Up failed", "Passwords do not match");
      return;
    }

    const response = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password: encryptedPassword(password),
      }),
    });
    
    if (response.status === 201) {
        Alert.alert(
          "Sign Up Successful",
          "You can now log in with your credentials."
        );
        navigation.popToTop();
    }else if (response.status === 409) {
        Alert.alert("Sign Up Failed", "User already exists. Please try again.");
    }else {
        Alert.alert("Sign Up Failed", "An error occurred. Please try again.");
      }
    } catch (error) {
      Alert.alert("Sign Up Failed", "An error occurred. Please try again.");
      console.log(error);
    }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <Button title="Sign Up" onPress={handleSignUp} />
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "80%",
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
});

export default SignUp;