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
import {  SignUpType } from "../utils/Helper";
import { googleSignUpLogin, emailLogin } from "../services/auth";
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { PreferenceService } from "../services/user_PreferencesService";

const Login = ({ navigation }) => {
  const { signIn, user, updateUser } = useAuth();
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
      } else if (signUpType === SignUpType.Google) {
        ({ status, response } = await googleSignUpLogin());
      }

      if (response.token && (status === 200 || status === 201)) {
        // Store the token in MMKV storage

        const userData = {
          token: response.token,
          username: response.username,
          isNewUser: false,
          email: response.email,

          preferences: response.preferences || {},
        };

        log.info('Login successful', { username: response.username });
        
        // Fetch user preferences after login
        ({ status, response } = await PreferenceService.fetchUserPreferences(userData.username, userData.token));

        userData.preferences = response || {};
        signIn(userData);


        log.info("Preferences Response:", response);

      } else {
        setLoading(false);
        Alert.alert("Login failed", "An error occurred. Please try again.");
        return;
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