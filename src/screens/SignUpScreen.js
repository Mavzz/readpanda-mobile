import { useState } from "react";
import { encryptedPassword, fetchapiURL} from "../utils/Helper";
import { View, Text, TextInput, Pressable, Alert,ActivityIndicator } from "react-native";
import Background from "../components/Background";
import { primaryButton as PrimaryButton } from "../components/Button";
import { loginStyles } from "../styles/global";

const API_URL = fetchapiURL();

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
            marginBottom: 15,
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
          placeholderTextColor="#6c757d"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholderTextColor="#6c757d"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#6c757d"
          secureTextEntry
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor="#6c757d"
          secureTextEntry
        />
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <PrimaryButton onPress={handleSignUp} title="Sign Up" />
        )}
      </View>
    </Background>
  );
};

export default SignUp;