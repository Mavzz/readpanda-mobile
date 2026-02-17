import { Alert } from 'react-native';
import { postRequest } from './usePost';
import { NativeModules, Platform } from 'react-native';
import { GoogleAuthService } from './GoogleAuthService';
import { encryptedPassword, getBackendUrl } from '../utils/Helper';
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
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      };
      log.info('Google ID Token obtained', token);

      const responseAuth = await fetch(await getBackendUrl('/auth/google'), fetchOptions);
      status = responseAuth.status;
      response = await responseAuth.json();

    } else {
      Alert.alert('Login failed', 'An error occurred. Please try again.');
    }
  } else {
    try {
      const token = await GoogleSignInModule.signIn();
      console.log('Google ID Token:', token);

      if (token) {
        ({ status, response } = await postRequest(await getBackendUrl('/auth/google'),
          {},
          { Authorization: `Bearer ${token}` },
        ));

        console.log('Signup Response:', response);
      } else {
        Alert.alert('Login failed', 'An error occurred. Please try again.');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Login failed', 'An error occurred. Please try again.');
    }

  }

  if (status === 200 || status === 201) {
    return { status, response };
  } else {

    log.error('Google Sign Up/Login failed with status:', status);
    return { status, response: null };

  }
};

const emailLogin = async (username, password) => {
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  const responseAuth = await fetch(await getBackendUrl('/auth/login'), {
    ...fetchOptions,
    body: JSON.stringify({
      username,
      password: encryptedPassword(password),
    }),
  });

  const status = responseAuth.status;
  const response = await responseAuth.json();

  if (status === 200) {
    log.info('Login successful with status:', status);
    return { status, response };
  }
  else {
    log.error('Login failed with status:', status);
    return { status, response: null };
  }


};

const emailSignUp = async (username, password, email) => {
  log.info('Attempting Sign Up with username:', username, 'email:', email);

  const { status, response } = await postRequest(await getBackendUrl('/signup'), {
    username,
    password: encryptedPassword(password),
    email,
  });

  if (status === 201) {
    log.info('Sign Up successful with status:', status);
    return { status, response };
  }
  else {
    log.error('Sign Up failed with status:', status);
    return { status, response: null };
  }

  //const response = await signUpUser(username, password, email);
  //console.log("Sign Up Response:", response);
};
const logout = async (username, refreshToken) => {
  const { status } = await postRequest(await getBackendUrl(`/auth/logout?username=${username}`),
    {},
    { Authorization: `Bearer ${refreshToken}` },
  );
  log.info(`User logged out: ${username}`, status);
};


export { googleSignUpLogin, emailLogin, emailSignUp, logout };
