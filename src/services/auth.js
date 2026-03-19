import { Alert, Platform, NativeModules } from 'react-native';
import { postRequest } from './usePost';
import { GoogleAuthService } from './GoogleAuthService';
import { getBackendUrl } from '../utils/Helper';
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
      log.info('Google ID Token obtained');

      ({ status, response } = await postRequest(
        getBackendUrl('/auth/google'),
        {},
        { Authorization: `Bearer ${token}` },
      ));

    } else {
      Alert.alert('Login failed', 'An error occurred. Please try again.');
    }
  } else {
    try {
      const token = await GoogleSignInModule.signIn();

      if (token) {
        ({ status, response } = await postRequest(
          getBackendUrl('/auth/google'),
          {},
          { Authorization: `Bearer ${token}` },
        ));

        log.info('Google sign-in response received');
      } else {
        Alert.alert('Login failed', 'An error occurred. Please try again.');
      }
    } catch (error) {
      log.error('Google Sign-In Error:', error);
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
  const { status, response } = await postRequest(
    getBackendUrl('/auth/login'),
    {
      username,
      password: password,
    },
  );

  if (status === 200) {
    log.info('Login successful with status:', status);
    return { status, response };
  } else {
    log.error('Login failed with status:', status);
    return { status, response: null };
  }
};

const emailSignUp = async (username, password, email) => {
  log.info('Attempting Sign Up with username:', username, 'email:', email);

  const { status, response } = await postRequest(getBackendUrl('/signup'), {
    username,
    password: password,
    email,
  });

  if (status === 201) {
    log.info('Sign Up successful with status:', status);
    return { status, response };
  } else {
    log.error('Sign Up failed with status:', status);
    return { status, response: null };
  }
};

const logout = async (username, refreshToken) => {
  const { status } = await postRequest(
    getBackendUrl(`/auth/logout?username=${username}`),
    {},
    { Authorization: `Bearer ${refreshToken}` },
  );
  log.info(`User logged out: ${username}`, status);
};


export { googleSignUpLogin, emailLogin, emailSignUp, logout };
