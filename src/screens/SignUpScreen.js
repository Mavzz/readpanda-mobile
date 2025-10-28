import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import Background from "../components/Background";
import {
  primaryButton as PrimaryButton,
  ssoButton as SSOButton,
} from "../components/Button";
import { loginStyles } from "../styles/global";
import { SignUpType } from "../utils/Helper";
import log from "../utils/logger";
import { googleSignUpLogin, emailSignUp } from "../services/auth";
import { useAuth } from '../contexts/AuthContext';
import { PreferenceService } from "../services/user_PreferencesService";

const SignUp = ({ navigation }) => {
  const { signIn, updateUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  let status, response;

  const handleSignUp = async (signUpType = "") => {

    log.info(`Sign up attempt with type: ${signUpType}`);

    try {
      setLoading(true);
      if (signUpType === SignUpType.Google) {

        ({ status, response } = await googleSignUpLogin());

      } else if (signUpType === SignUpType.Email) {

        if (!username || !email || !password || !confirmPassword) {
          setLoading(false);
          Alert.alert("Sign Up failed", "Please fill in all fields");
          return;
        }

        if (password !== confirmPassword) {
          setLoading(false);
          Alert.alert("Sign Up failed", "Passwords do not match");
          return;
        }

        ({ status, response } = await emailSignUp(username, password, email));
      }

      if (response.accessToken && (status === 200 || status === 201)) {
        // Store the token in MMKV storage
        const userData = {
          token: response.accessToken,
          refreshToken: response.refreshToken,
          userDetails: {
            username: response.username,
            email: email,
            isNewUser: true,
            preferences: response.preferences || {},
          }
        };

        ({ status, response } = await PreferenceService.fetchUserPreferences(userData.username, userData.token));
        
        userData.preferences = response || {};
        signIn(userData);

        log.info("Preferences Response:", response);

      } else {
        setLoading(false);
        log.error("Sign Up failed with status:", status);
        Alert.alert("Sign Up failed", "An error occurred. Please try again.");
        return;
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Login failed", "An error occurred. Please try again.");
      log.error('Sign Up failed with error:', error);
    } finally {
      setLoading(false);
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
          <Pressable onPress={() => navigation.popTo("Login")}>
            <Text style={loginStyles.signUpText}> Login!</Text>
          </Pressable>
        </View>
        <TextInput
          style={loginStyles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor="#6c757d"
          autoCapitalize="none"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholderTextColor="#6c757d"
          autoCapitalize="none"
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#6c757d"
          autoCapitalize="none"
          secureTextEntry
        />
        <TextInput
          style={loginStyles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor="#6c757d"
          autoCapitalize="none"
          secureTextEntry
        />
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <>
            <PrimaryButton
              onPress={() => handleSignUp("Email")}
              title="Sign Up"
            />
            <View style={loginStyles.dividerContainer}>
              <View style={loginStyles.divider} />
              <Text style={loginStyles.orText}>or</Text>
              <View style={loginStyles.divider} />
            </View>

            <SSOButton
              onPress={() => handleSignUp("Google")}
              title="Sign Up with Google"
            />
          </>
        )}
      </View>
    </Background>
  );
};

export default SignUp;
