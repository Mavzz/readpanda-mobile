import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { primaryButton as PrimaryButton } from '../components/Button';
import { SignUpType } from '../utils/Helper';
import { googleSignUpLogin, appleSignUpLogin, emailLogin } from '../services/auth';
import log from '../utils/logger';
import useAuthStore from '../stores/authStore';
import { PreferenceService } from '../services/preferencesService';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';
import ReadableColumn from '../components/ReadableColumn';
import { showToast } from '../components/Toaster';
import OneTapButtons from './signUp/OneTapButtons';
import TermsLine from './signUp/TermsLine';
import readpandaLogo from '../assets/readpandaLogo_New.png';

const Login = ({ navigation }) => {
  const signIn = useAuthStore((s) => s.signIn);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oneTapBusy, setOneTapBusy] = useState(null);
  const { sizeClass } = useLayout();
  let status, response;

  // Store the session, then load the reader's preferences. A new account
  // (201, only possible via Apple or Google) goes on to the interests picker,
  // as it does from Sign up (R9.2).
  const finishSignIn = async (signInStatus, signInResponse) => {
    const userData = {
      token: signInResponse.accessToken,
      refreshToken: signInResponse.refreshToken,
      userDetails: {
        username: signInResponse.username,
        email: signInResponse.email,
        profilePicture: signInResponse.picture || null,
        isNewUser: signInStatus === 201,
        ...(signInStatus === 201 ? { createdAt: Date.now() } : {}),
        preferences: {},
      },
    };

    signIn(userData);

    const { response: preferences } = await PreferenceService.fetchUserPreferences(userData.userDetails.username);

    userData.userDetails.preferences = preferences || {};
    updateUser(userData.userDetails);
    log.info('Login successful userData:', userData);
  };

  // Apple and Google (R9): the same buttons and failure toast as Sign up.
  const oneTap = async (which) => {
    setOneTapBusy(which);
    try {
      const result = which === 'apple' ? await appleSignUpLogin() : await googleSignUpLogin();
      if (result.cancelled) {
        return;
      }
      if (result.response?.accessToken) {
        await finishSignIn(result.status, result.response);
        return;
      }
      log.error(`${which} login failed:`, result.status);
      showToast(result.error?.error || `Couldn't continue with ${which === 'apple' ? 'Apple' : 'Google'}. Try again.`, 'error');
    } catch (error) {
      log.error(`${which} login failed with error:`, error);
      showToast(`Couldn't continue with ${which === 'apple' ? 'Apple' : 'Google'}. Try again.`, 'error');
    } finally {
      setOneTapBusy(null);
    }
  };

  const handleLogin = async () => {
    if (oneTapBusy) {
      return;
    }
    log.info('Login attempt with type:', SignUpType.Email);
    if (!username || !password) {
      Alert.alert('Login In failed', 'Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      ({ status, response } = await emailLogin(username, password));

      if (response?.accessToken && (status === 200 || status === 201)) {
        await finishSignIn(200, response);
      } else {
        Alert.alert('Login failed', 'An error occurred. Please try again.');
      }
    } catch (error) {
      log.error('Login failed with error:', error);
      Alert.alert('Login failed', 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const wide = sizeClass === 'wide';

  const brand = (
    <View style={wide ? styles.brandPanel : styles.brand}>
      <Image
        source={readpandaLogo}
        style={wide ? styles.logoLarge : styles.logo}
      />
      <Text style={wide ? styles.headlineLarge : styles.headline}>
        Your book club,{'\n'}on everyone&apos;s schedule
      </Text>
      <Text style={wide ? styles.subtitleLarge : styles.subtitle}>
        Read together. Comment freely. No spoilers.
      </Text>
    </View>
  );

  const form = (
    <>
      <View style={styles.oneTap}>
        <OneTapButtons
          busy={oneTapBusy || (loading && 'email')}
          onApple={() => oneTap('apple')}
          onGoogle={() => oneTap('google')}
        />
      </View>

      <View style={styles.fields}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={DS.colors.placeholder}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={DS.colors.placeholder}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          secureTextEntry={true}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={DS.colors.primary} />
      ) : (
        <PrimaryButton title="Step inside" onPress={handleLogin} />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>New here?</Text>
        <Pressable onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.footerLink}> Create an account</Text>
        </Pressable>
      </View>
      {/* Continue with Apple or Google here can create an account without
        ever passing Sign up, so the agreement shows here too. */}
      <TermsLine style={styles.terms} />
    </>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      {wide ? (
        // 15a: the brand panel on the left, the form in a 400pt column on
        // the right, so the fields never stretch.
        <View style={styles.split}>
          {brand}
          <View style={styles.formSide}>
            <View style={styles.formColumn}>{form}</View>
          </View>
        </View>
      ) : (
        // Phone, and the iPad portrait layout: the same single column,
        // capped at 440pt on iPad.
        <View style={styles.container}>
          <ReadableColumn maxWidth={440}>
            {brand}
            {form}
          </ReadableColumn>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 26,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  brandPanel: {
    flex: 1,
    minWidth: 0,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    padding: 40,
  },
  formSide: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formColumn: {
    width: 400,
  },
  logoLarge: {
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  headlineLarge: {
    fontSize: 36,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.8,
    textAlign: 'center',
    lineHeight: 41,
  },
  subtitleLarge: {
    fontSize: 15,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  logo: {
    width: 190,
    height: 190,
    borderRadius: 95,
    marginBottom: 2,
  },
  headline: {
    fontSize: 28,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
  },
  oneTap: {
    marginBottom: 22,
  },
  fields: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: DS.colors.surfaceContainerLowest,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: DS.radius.md,
    fontSize: 15,
    fontFamily: DS.font.regular,
    marginBottom: 12,
    color: DS.colors.onSurface,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },
  footerLabel: {
    fontSize: 14,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurfaceVariant,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  terms: {
    marginTop: 16,
  },
});

export default Login;
