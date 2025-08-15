import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import Background from "../components/Background";
import { loginStyles } from "../styles/global";
import { primaryButton as PrimaryButton, ssoButton as SSOButton, } from "../components/Button";
import { storage } from "../utils/storage";
import { useGet } from "../services/useGet";
import { getBackendUrl, SignUpType } from "../utils/Helper";
import { googleSignUpLogin, emailLogin } from "../utils/auth";
import log from '../utils/logger';

const Login = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  let status, response;

  const handleLogin = async (signUpType = "") => {
    log.info('Login attempt with type:', signUpType);
    try {

      setLoading(true);
      if (signUpType === SignUpType.Email) {

        if (!username || !password) {
          setLoading(false);
          Alert.alert("Login In failed", "Please fill in all fields");
          return;
        } else {
          ({ status, response } = await emailLogin(username, password));
        }
      }
      else if (signUpType === SignUpType.Google) {
        ({ status, response } = await googleSignUpLogin());
      }

      if (response.token) {
        // Store the token in MMKV storage
        const userStorage = storage("user_storage");
        userStorage.set("token", response.token);
        userStorage.set("username", response.username);

        log.info("Login Response:", response);

        if (status === 200) {

          ({ status, response } = await useGet(
            await getBackendUrl(`/user/preferences?username=${response.username}`),
            {
              Authorization: `Bearer ${response.token}`,
            }
          ));

          log.info("Preferences Response:", response);

          navigation.navigate("InterestScreen", {
            username: response.username,
            preferences: response,
          });

        } else if (status === 403) {
          setLoading(false);
          log.error('Login failed with status 403');
          Alert.alert(
            "Login Failed",
            "Forbidden: You do not have permission to access this resource."
          );
        } else if (status === 500) {
          setLoading(false);
          log.error('Login failed with status 500');
          Alert.alert(
            "Login Failed",
            "Internal Server Error: Please try again later."
          );
        } else if (status === 401) {
          setLoading(false);
          log.error('Login failed with status 401');
          Alert.alert(
            "Login Failed",
            "Unauthorized: Please check your authentication token."
          );
        } else if (status === 400) {
          setLoading(false);
          log.error('Login failed with status 400');
          Alert.alert(
            "Login Failed",
            "Bad Request: Please check the data sent to the server."
          );
        } else {
          setLoading(false);
          log.error(`Login failed with status ${status}`);
          Alert.alert("Login Failed", "An error occurred. Please try again.");
        }
      } else {
        setLoading(false);
        log.error('Login failed, no token in response');
        Alert.alert("Login failed", "An error occurred. Please try again.");
      }


    } catch (error) {
      setLoading(false);
      log.error('Login failed with error:', error);
      Alert.alert("Login failed", "An error occurred. Please try again.");
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
            <Pressable onPress={() => navigation.navigate("SignUp")}>
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
            autoCapitalize="none"
          />
          <TextInput
            style={loginStyles.input}
            placeholder="Password"
            placeholderTextColor="#6c757d"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry={true}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <PrimaryButton title="Login" onPress={() => handleLogin("Email")} />

            <View style={loginStyles.dividerContainer}>
              <View style={loginStyles.divider} />
              <Text style={loginStyles.orText}>or</Text>
              <View style={loginStyles.divider} />
            </View>

            <SSOButton onPress={() => handleLogin("Google")} title="Sign In with Google" />
          </>
        )}

      </View>
    </Background>
  );
};

export default Login;
