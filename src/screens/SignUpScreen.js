import { useState } from "react";
import encryptedPassword from "../utils/Helper";
import { View, Text, TextInput, Button, Pressable, Alert,ActivityIndicator } from "react-native";
import { API_URL } from "@env";
import Background from "../components/Background";
import { loginStyles } from "../styles/global";

const SignUp = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    try {
      if (!username || !password || !confirmPassword) {
        setLoading(false);
        Alert.alert("Sign Up failed", "Please fill in all fields");
        return;
      }

      if (password !== confirmPassword) {
        setLoading(false);
        Alert.alert("Sign Up failed", "Passwords do not match");
        return;
      }
      console.log("`${API_URL}/signup`");
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
        setLoading(true);
        Alert.alert(
          "Sign Up Successful",
          "You can now log in with your credentials."
        );
        navigation.replace("Login");
      } else if (response.status === 409) {
        setLoading(false);
        Alert.alert("Sign Up Failed", "User already exists. Please try again.");
      } else {
        setLoading(false);
        Alert.alert("Sign Up Failed", "An error occurred. Please try again.");
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Sign Up Failed", "An error occurred. Please try again.");
      console.log(error);
    }
  };

  return (
    <Background>
      <View style={loginStyles.container}>
        <Text style={loginStyles.mainTitletext}>Sign Up</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingBottom: 10,
          }}
        >
          <Text style={loginStyles.title}>Already have an account?</Text>
          <Pressable onPress={() => navigation.replace("Login")}>
            <Text style={loginStyles.signUpText}> Login!</Text>
          </Pressable>
        </View>
        <TextInput
          style={loginStyles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="#548C2F"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholderTextColor="#548C2F"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#548C2F"
          secureTextEntry
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor="#548C2F"
          secureTextEntry
        />
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <View>
            <Pressable onPress={handleSignUp} style={loginStyles.loginButton}>
              <Text style={loginStyles.loginButtonText}>Sign Up</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Background>
  );
};

export default SignUp;