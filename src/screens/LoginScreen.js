import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { primaryButton as PrimaryButton, ssoButton as SSOButton } from '../components/Button';
import { SignUpType } from '../utils/Helper';
import { googleSignUpLogin, emailLogin } from '../services/auth';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { PreferenceService } from '../services/user_PreferencesService';
import { DS } from '../styles/global';

const Login = ({ navigation }) => {
  const { signIn, user, updateUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Login</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Don't have an account?</Text>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.switchLink}> Sign up!</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={DS.colors.onSurfaceVariant}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={DS.colors.onSurfaceVariant}
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
            <PrimaryButton title="Login" onPress={() => handleLogin('Email')} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <SSOButton onPress={() => handleLogin('Google')} title="Sign In with Google" />
          </>
        )}
      </View>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: DS.colors.onSurface,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 15,
    color: DS.colors.onSurfaceVariant,
  },
  switchLink: {
    fontSize: 15,
    color: DS.colors.primary,
    fontWeight: '600',
  },
  fields: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: DS.colors.surfaceContainerLowest,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: DS.radius.md,
    fontSize: 16,
    marginBottom: 16,
    color: DS.colors.onSurface,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
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
    fontSize: 14,
  },
});

export default Login;