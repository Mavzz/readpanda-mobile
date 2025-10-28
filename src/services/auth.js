import { Alert } from 'react-native';
import { usePost } from "./usePost";
import { NativeModules, Platform } from "react-native";
import { GoogleAuthService } from './GoogleAuthService';
import { encryptedPassword, getBackendUrl } from "../utils/Helper";
import log from '../utils/logger';


const { GoogleSignInModule } = NativeModules;

// Function to handle Google sign-up/login

const googleSignUpLogin = async () => {
  let status;
  let response;
  // Attempt to sign in with Google

  if (Platform.OS === 'ios') {
    const result = await GoogleAuthService.signInWithGoogle();

    if (result) {
      const token = result.user.idToken;
      log.info("Google ID Token obtained", token);

      ({ status, response } = await usePost(await getBackendUrl("/auth/google"),
        {},
        { Authorization: `Bearer ${token}` },
      ));

      log.info("Signup Response received from backend");
    } else {
      Alert.alert("Login failed", "An error occurred. Please try again.");
    }
  } else {
    try {
      const token = await GoogleSignInModule.signIn();
      console.log("Google ID Token:", token);

      if (token) {
        ({ status, response } = await usePost(await getBackendUrl("/auth/google"),
          {},
          { Authorization: `Bearer ${token}` },
        ));

        console.log("Signup Response:", response);
      } else {
        Alert.alert("Login failed", "An error occurred. Please try again.");
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      Alert.alert("Login failed", "An error occurred. Please try again.");
    }

  }

  if (status === 200 || status === 201) {

    log.info("Google Sign Up/Login successful with status:", status);
    log.info("Google Sign Up/Login Response:", response);
    return { status, response };
  } else {

    log.error("Google Sign Up/Login failed with status:", status);
    return { status, response: null };

  }
};

const emailLogin = async (username, password) => {
  let status;
  let response;

  ({ status, response } = await usePost(await getBackendUrl("/auth/login"),
    {
      username,
      password: encryptedPassword(password),
    }));

  if (status === 200) {
    log.info("Login successful with status:", status);
    return { status, response };
  }
  else {
    log.error("Login failed with status:", status);
    return { status, response: null };
  }


}

const emailSignUp = async (username, password, email) => {
  let status;
  let response;

  log.info("Attempting Sign Up with username:", username, "email:", email);

  ({ status, response } = await usePost(await getBackendUrl("/signup"), {
    username,
    password: encryptedPassword(password),
    email,
  }));

  if (status === 201) {
    log.info("Sign Up successful with status:", status);
    return { status, response };
  }
  else {
    log.error("Sign Up failed with status:", status);
    return { status, response: null };
  }

  //const response = await signUpUser(username, password, email);
  //console.log("Sign Up Response:", response);
};
const logout = async (username, refreshToken) => {
  let status;
  let response;
  ({ status, response } = await usePost(await getBackendUrl(`/auth/logout?username=${username}`),
    {},
    { Authorization: `Bearer ${refreshToken}` },
  ));
  log.info(`User logged out: ${username}`);
};


export { googleSignUpLogin, emailLogin, emailSignUp, logout };
