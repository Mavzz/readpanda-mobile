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
import { NativeModules } from "react-native";
import { usePost } from "../services/usePost";
import { useGet } from "../services/useGet";
import { encryptedPassword, getBackendUrl } from "../utils/Helper";
import { storage } from "../utils/storage";

const { GoogleSignInModule } = NativeModules;

const SignUp = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  let status, response;


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

      try{
          ({ status, response } = await usePost(await getBackendUrl("/signup"), {
          username,
          password: encryptedPassword(password),
          email,
        }));

        // Store the token in MMKV storage
        const userStorage = storage("user_storage");
        userStorage.set("token", response.token);
        userStorage.set("username", username);
        
        console.log("Signup Response:", response);
        
      }
      catch (err) { 
        console.log(err);
      }

      //const response = await signUpUser(username, password, email);
      //console.log("Sign Up Response:", response);

      if (status === 201) {
        setLoading(true);

        /*const preferences = await getUserPreferences(
          response.token,
          username);*/

        try {
          ({ status, response } = await useGet(
            await getBackendUrl(`/user/preferences?username=${response.username}`),
            {
              Authorization: `Bearer ${response.token}`,
            }
          ));
        } catch (err) {
          console.log(err);
        }

        console.log("Preferences Response:", response);

        navigation.replace("InterestScreen", {
          username: username,
          preferences: response,
        });
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
  const handleGoogleSignUp = async () => {
    // Attempt to sign in with Google
    try {
      const token = await GoogleSignInModule.signIn();
      console.log("Google ID Token:", token);

      try {
        ({ status, response } = await usePost(await getBackendUrl("/auth/google"), {
          token,
        }));

        console.log("Signup Response:", response);
      } catch (err) {
        console.log(err);
      }

      if (status === 201) {

        try {
          ({ status, response } = await useGet(
            await getBackendUrl(`/user/preferences?username=${response.username}`),
            {
              Authorization: `Bearer ${response.token}`,
            }
          ));
        } catch (err) {
          console.log(err);
        }

        console.log("Preferences Response:", response);

        navigation.replace("InterestScreen", {
          username: username,
          preferences: response,
        });
      } else if (status === 403) {
        Alert.alert(
          "Sign Up Failed",
          "Forbidden: You do not have permission to access this resource."
        );
      } else if (status === 500) {
        Alert.alert(
          "Sign Up Failed",
          "Internal Server Error: Please try again later."
        );
      } else if (status === 401) {
        Alert.alert(
          "Sign Up Failed",
          "Unauthorized: Please check your authentication token."
        );
      } else if (status === 400) {
        Alert.alert(
          "Sign Up Failed",
          "Bad Request: Please check the data sent to the server."
        );
      } else if (status === 409) {
        Alert.alert("Sign Up Failed", "User already exists. Please try again.");
      } else {
        Alert.alert("Sign Up Failed", "An error occurred. Please try again.");
      }
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      Alert.alert("Google Sign-In Failed", "Please try again.");
      return;
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
        <SSOButton onPress={handleGoogleSignUp} title="Sign Up with Google" />
      </View>
    </Background>
  );
};

export default SignUp;
