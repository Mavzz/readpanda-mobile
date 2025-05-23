import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { loginUser, getUserPreferences } from "../services/api";
import { storeToken } from "../utils/storage";
import Background from "../components/Background";
import { loginStyles } from "../styles/global";
import { primaryButton as PrimaryButton } from "../components/Button";

const Login = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const data = await loginUser(username, password);
      console.log(`Root username: ${data.token}`);
      const preferences = await getUserPreferences(data.token, username);

      await storeToken(data.token, username);
      navigation.popTo("InterestScreen", { username, preferences });
    } catch (error) {
      Alert.alert("Login failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <View style={loginStyles.container}>
        <View>
          <Text style={loginStyles.mainTitletext}>Login</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <Text style={loginStyles.title}>Don't have an account?</Text>
            <Pressable onPress={() => navigation.replace("SignUp")}>
              <Text style={loginStyles.signUpText}> sign up!</Text>
            </Pressable>
          </View>
        </View>
        <View>
          <TextInput
            style={loginStyles.input}
            placeholder="Username"
            placeholderTextColor="#6c757d"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={loginStyles.input}
            placeholder="Password"
            placeholderTextColor="#6c757d"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <PrimaryButton title="Login" onPress={handleLogin} />
        )}

        <View style={loginStyles.dividerContainer}>
          <View style={loginStyles.divider} />
          <Text style={loginStyles.orText}>or</Text>
          <View style={loginStyles.divider} />
        </View>

        <Pressable style={loginStyles.ssoButton}>
          <Text style={loginStyles.ssoButtonText}>SSO place holder</Text>
        </Pressable>
      </View>
    </Background>
  );
};

export default Login;
