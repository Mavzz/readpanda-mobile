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
import { primaryButton as PrimaryButton, ssoButton as SSOButton } from '../components/Button';
import { SignUpType } from '../utils/Helper';
import { googleSignUpLogin, emailLogin } from '../services/auth';
import log from '../utils/logger';
import useAuthStore from '../stores/authStore';
import { PreferenceService } from '../services/preferencesService';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';
import ReadableColumn from '../components/ReadableColumn';
import readpandaLogo from '../assets/readpandaLogo_New.png';

const Login = ({ navigation }) => {
  const signIn = useAuthStore((s) => s.signIn);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { sizeClass } = useLayout();
  let status, response;

  const handleLogin = async (signUpType = '') => {
    log.info('Login attempt with type:', signUpType);
    try {
      setLoading(true);
      if (signUpType === SignUpType.Email) {
        if (!username || !password) {
          setLoading(false);
          Alert.alert('Login In failed', 'Please fill in all fields');
          return;
        } else {
          ({ status, response } = await emailLogin(username, password));
        }
      } else if (signUpType === SignUpType.Google) {
        ({ status, response } = await googleSignUpLogin());
      }

      if (response.accessToken && (status === 200 || status === 201)) {
        const userData = {
          token: response.accessToken,
          refreshToken: response.refreshToken,
          userDetails: {
            username: response.username,
            email: response.email,
            profilePicture: response.picture || null,
            isNewUser: false,
            preferences: {},
          },
        };

        signIn(userData);

        ({ status, response } = await PreferenceService.fetchUserPreferences(userData.userDetails.username));

        userData.userDetails.preferences = response || {};
        updateUser(userData.userDetails);
        log.info('Login successful userData:', userData);
      } else {
        setLoading(false);
        Alert.alert('Login failed', 'An error occurred. Please try again.');
        return;
      }
    } catch (error) {
      setLoading(false);
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
        <>
          <PrimaryButton title="Step inside" onPress={() => handleLogin('Email')} />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <SSOButton onPress={() => handleLogin('Google')} title="Continue with Google" />
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>New here?</Text>
        <Pressable onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.footerLink}> Create an account</Text>
        </Pressable>
      </View>
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DS.colors.outlineVariant,
    opacity: 0.3,
  },
  orText: {
    marginHorizontal: 12,
    color: DS.colors.onSurfaceVariant,
    fontFamily: DS.font.regular,
    fontSize: 13,
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
});

export default Login;
