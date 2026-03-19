import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  primaryButton as PrimaryButton,
  ssoButton as SSOButton,
} from '../components/Button';
import { SignUpType } from '../utils/Helper';
import log from '../utils/logger';
import { googleSignUpLogin, emailSignUp } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { PreferenceService } from '../services/user_PreferencesService';
import { DS } from '../styles/global';

const SignUp = ({ navigation }) => {
  const { signIn, updateUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  let status, response;

  const handleSignUp = async (signUpType = '') => {
    log.info(`Sign up attempt with type: ${signUpType}`);
    try {
      setLoading(true);
      if (signUpType === SignUpType.Google) {
        ({ status, response } = await googleSignUpLogin());
      } else if (signUpType === SignUpType.Email) {
        if (!username || !email || !password || !confirmPassword) {
          setLoading(false);
          Alert.alert('Sign Up failed', 'Please fill in all fields');
          return;
        }
        if (password !== confirmPassword) {
          setLoading(false);
          Alert.alert('Sign Up failed', 'Passwords do not match');
          return;
        }
        ({ status, response } = await emailSignUp(username, password, email));
      }

      if (response.accessToken && (status === 200 || status === 201)) {
        const userData = {
          token: response.accessToken,
          refreshToken: response.refreshToken,
          userDetails: {
            username: response.username,
            email: email,
            isNewUser: true,
            preferences: response.preferences || {},
          },
        };

        signIn(userData);

        ({ status, response } = await PreferenceService.fetchUserPreferences(userData.userDetails.username));
        userData.userDetails.preferences = response || {};
        updateUser(userData.userDetails);
        log.info('Preferences Response:', response);
      } else {
        setLoading(false);
        log.error('Sign Up failed with status:', status);
        Alert.alert('Sign Up failed', 'An error occurred. Please try again.');
        return;
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Login failed', 'An error occurred. Please try again.');
      log.error('Sign Up failed with error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Sign Up</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Already have an account?</Text>
            <Pressable onPress={() => navigation.popTo('Login')}>
              <Text style={styles.switchLink}> Login!</Text>
            </Pressable>
          </View>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          placeholderTextColor={DS.colors.onSurfaceVariant}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholderTextColor={DS.colors.onSurfaceVariant}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          placeholderTextColor={DS.colors.onSurfaceVariant}
          autoCapitalize="none"
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholderTextColor={DS.colors.onSurfaceVariant}
          autoCapitalize="none"
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size="large" color={DS.colors.primary} />
        ) : (
          <>
            <PrimaryButton onPress={() => handleSignUp('Email')} title="Sign Up" />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <SSOButton onPress={() => handleSignUp('Google')} title="Sign Up with Google" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
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

export default SignUp;
