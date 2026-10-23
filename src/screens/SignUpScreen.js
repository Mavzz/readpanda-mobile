import { useCallback, useState } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import log from '../utils/logger';
import { googleSignUpLogin, appleSignUpLogin } from '../services/auth';
import useAuthStore from '../stores/authStore';
import { PreferenceService } from '../services/preferencesService';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';
import { showToast } from '../components/Toaster';
import useSignUpForm from './signUp/useSignUpForm';
import SignUpForm from './signUp/SignUpForm';
import OneTapButtons from './signUp/OneTapButtons';
import { SignUpPhone, SignUpCard, SignUpSplit } from './signUp/SignUpLayouts';

// Sign up (turn 17): Apple and Google first, then a three-field email form
// with every problem shown under its own field — never an Alert. The phone
// gets one column (17a/17b); iPad, by width, a centred card at 700–999pt
// (17d) or a split with what the app is at ≥ 1000pt (17c).
const SignUp = ({ navigation }) => {
  const signIn = useAuthStore((s) => s.signIn);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { sizeClass, pagePad } = useLayout();
  const [oneTapBusy, setOneTapBusy] = useState(null);

  // Any successful sign-up or sign-in: store the session, then load the
  // reader's preferences. A new account (201) goes on to the interests picker
  // (isNewUser); a returning Apple or Google one (200) doesn't.
  const finishSignIn = useCallback(async (status, response, email) => {
    const userDetails = {
      username: response.username,
      email: response.email || email || null,
      profilePicture: response.picture || null,
      isNewUser: status === 201,
      // The API doesn't return one yet; Profile's "Joined …" (7c) and
      // "Reading since …" (7a) read it.
      ...(status === 201 ? { createdAt: Date.now() } : {}),
      preferences: response.preferences || {},
    };
    signIn({ token: response.accessToken, refreshToken: response.refreshToken, userDetails });
    try {
      const { response: preferences } = await PreferenceService.fetchUserPreferences(userDetails.username);
      updateUser({ ...userDetails, preferences: preferences || userDetails.preferences });
    } catch (error) {
      log.error('Preferences after sign-up failed:', error);
    }
  }, [signIn, updateUser]);

  const form = useSignUpForm({
    onSignedUp: (response, email) => finishSignIn(201, response, email),
  });

  const oneTap = async (which) => {
    setOneTapBusy(which);
    const result = which === 'apple' ? await appleSignUpLogin() : await googleSignUpLogin();
    setOneTapBusy(null);
    if (result.cancelled) {
      return;
    }
    if (result.response?.accessToken) {
      finishSignIn(result.status, result.response);
      return;
    }
    log.error(`${which} sign-up failed:`, result.status);
    // A suspended account has already been told, by apiService's alert.
    if (result.error?.code !== 'account_suspended') {
      showToast(result.error?.error || `Couldn't continue with ${which === 'apple' ? 'Apple' : 'Google'}. Try again.`, 'error');
    }
  };

  const logIn = () => navigation.popTo('Login');
  const buttons = (
    <OneTapButtons
      busy={oneTapBusy}
      onApple={() => oneTap('apple')}
      onGoogle={() => oneTap('google')}
    />
  );
  const fields = <SignUpForm form={form} />;

  let body = <SignUpPhone oneTap={buttons} form={fields} onLogIn={logIn} />;
  if (sizeClass === 'wide') {
    body = <SignUpSplit oneTap={buttons} form={fields} onLogIn={logIn} />;
  } else if (sizeClass === 'regular') {
    body = <SignUpCard oneTap={buttons} form={fields} onLogIn={logIn} pad={pagePad} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={sizeClass === 'wide' ? ['bottom'] : ['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      {body}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
});

export default SignUp;
