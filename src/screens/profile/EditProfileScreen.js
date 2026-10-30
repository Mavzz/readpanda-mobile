import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { showToast } from '../../components/Toaster';
import PressableScale from '../../components/PressableScale';
import useAuthStore from '../../stores/authStore';
import { checkUsername, updateProfile, changeEmail, changePassword } from '../../services/auth';
import enhancedStorage from '../../utils/enhancedStorage';
import { signsInWithPassword } from '../../utils/account';
import { useScreenTracking } from '../../utils/screenTracking';
import { DS } from '../../styles/global';
import useLayout from '../../hooks/useLayout';
import profileStyles from './profileStyles';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { FieldSheet } from './SettingsSheets';

// Edit profile (specs/coming-soon R5), from Profile's pill. One row per thing
// that can change, each opening its own sheet; nothing is saved until that
// sheet's Save, and each waits for the server's answer (no queueing offline:
// an account change needs to know it landed). Email and Password are only for
// accounts that sign in with them; Apple and Google own theirs (R5.7).
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_DISPLAY_NAME = 40;
const CHECK_PAUSE_MS = 400;

const RULE = 'Lowercase letters, numbers, dots or underscores, 3–20.';

const PROVIDERS = { social_apple: 'Apple', social_google: 'Google' };

// The server's refusal, in the sheet's words.
const failureText = (result, what) => {
  if (result.status === 0) {
    return 'Couldn\'t save. Check your connection.';
  }
  if (result.status === 403) {
    return 'That password isn\'t right.';
  }
  if (result.status === 409) {
    return what === 'email' ? 'That email is already in use.' : 'That username was just taken.';
  }
  return result.error || 'Couldn\'t save. Try again.';
};

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { isLarge, pagePad } = useLayout();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const syncAccount = useAuthStore((s) => s.syncAccount);
  useScreenTracking('EditProfileScreen');

  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // The username sheet's availability line: null, 'checking', or the check's answer.
  const [availability, setAvailability] = useState(null);
  // The username as typed breaks the rule (not just "too short so far").
  const [badUsername, setBadUsername] = useState(false);
  const checkTimer = useRef(null);
  const checkedFor = useRef('');

  useEffect(() => () => clearTimeout(checkTimer.current), []);

  // The rows depend on how the account signs in, which a session stored
  // before sign-ins said so doesn't know yet; and another device may have
  // changed the name. Catch up on opening.
  useEffect(() => {
    syncAccount();
  }, [syncAccount]);

  const close = () => {
    clearTimeout(checkTimer.current);
    setOpen(null);
    setError(null);
    setAvailability(null);
    setBadUsername(false);
  };

  const run = async (call, onDone, what) => {
    setBusy(true);
    setError(null);
    const result = await call();
    setBusy(false);
    if (result.ok) {
      onDone(result.profile);
      close();
    } else {
      setError(failureText(result, what));
      if (what === 'username' && result.suggestion) {
        setAvailability({ available: false, suggestion: result.suggestion });
      }
    }
  };

  const saveDisplayName = ({ displayName = '' }) => run(
    () => updateProfile({ display_name: displayName.trim() }),
    (profile) => updateUser({ displayName: profile?.display_name ?? null }),
  );

  const saveUsername = ({ username = '' }) => {
    const next = username.trim().toLowerCase();
    return run(
      () => updateProfile({ username: next }),
      (profile) => {
        const saved = profile?.username || next;
        // Before the profile switches name: the device's data is keyed by it (R5.4).
        enhancedStorage.renameAccountData(user.username, saved);
        updateUser({ username: saved });
        showToast(`You're @${saved} now`, 'success');
      },
      'username',
    );
  };

  const saveEmail = ({ email = '', password = '' }) => run(
    () => changeEmail(email.trim().toLowerCase(), password),
    (profile) => {
      updateUser({ email: profile?.email || email.trim().toLowerCase() });
      showToast('Email changed.', 'success');
    },
    'email',
  );

  const savePassword = ({ current = '', next = '' }) => run(
    () => changePassword(current, next),
    () => showToast('Password changed.', 'success'),
    'password',
  );

  // Availability as the reader types, after a pause (R5.3). Only the answer
  // for what's in the field now is kept.
  const onUsernameChange = ({ username = '' }) => {
    setError(null);
    clearTimeout(checkTimer.current);
    const next = username.trim().toLowerCase();
    checkedFor.current = next;
    setBadUsername(next.length > 0 && !USERNAME_PATTERN.test(next));
    if (!USERNAME_PATTERN.test(next) || next === user?.username) {
      setAvailability(null);
      return;
    }
    setAvailability('checking');
    checkTimer.current = setTimeout(async () => {
      const result = await checkUsername(next);
      if (checkedFor.current === next) {
        setAvailability(result);
      }
    }, CHECK_PAUSE_MS);
  };

  const usernameHint = () => {
    if (availability === 'checking') {
      return 'Checking…';
    }
    if (availability?.available === true) {
      return 'Available';
    }
    if (availability?.available === false) {
      return availability.suggestion ? `Taken. Try "${availability.suggestion}".` : (availability.error || 'Taken.');
    }
    return RULE;
  };

  const provider = PROVIDERS[user?.loginType];

  return (
    <SafeAreaView style={profileStyles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView
        contentContainerStyle={[profileStyles.content, isLarge && { paddingHorizontal: pagePad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nav}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={profileStyles.circleButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </PressableScale>
          <Text style={styles.title}>Edit profile</Text>
        </View>

        <View style={isLarge && styles.column}>
          <SettingsGroup title="Profile">
            <SettingsRow
              icon="person-outline"
              label="Display name"
              value={user?.displayName || 'Add a name'}
              onPress={() => setOpen('displayName')}
            />
            <SettingsRow
              icon="at-outline"
              label="Username"
              value={user?.username ? `@${user.username}` : undefined}
              onPress={() => setOpen('username')}
            />
          </SettingsGroup>

          {signsInWithPassword(user) ? (
            <SettingsGroup title="Sign-in">
              <SettingsRow icon="mail-outline" label="Email" value={user?.email} onPress={() => setOpen('email')} />
              <SettingsRow icon="key-outline" label="Password" value="••••••••" onPress={() => setOpen('password')} />
            </SettingsGroup>
          ) : provider ? (
            <SettingsGroup title="Sign-in">
              <SettingsRow icon={`logo-${provider.toLowerCase()}`} label={`Signed in with ${provider}`} value={user?.email} />
            </SettingsGroup>
          ) : null}
        </View>
      </ScrollView>

      <FieldSheet
        visible={open === 'displayName'}
        title="Display name"
        message="Shown on your profile, above your @username."
        fields={[{ key: 'displayName', value: user?.displayName || '', placeholder: 'Your name', maxLength: MAX_DISPLAY_NAME, autoCapitalize: 'words', textContentType: 'name' }]}
        canSave={({ displayName = '' }) => displayName.trim() !== (user?.displayName || '')}
        onChange={() => setError(null)}
        error={error}
        busy={busy}
        onSave={saveDisplayName}
        onClose={close}
      />
      <FieldSheet
        visible={open === 'username'}
        title="Username"
        message="Your comments and rooms show the new one."
        // No maxLength: an older Google account's username is its Google name,
        // which can run past 20, and iOS would then refuse every keystroke.
        fields={[{ key: 'username', value: user?.username || '', placeholder: 'username', autoCapitalize: 'none', textContentType: 'username' }]}
        canSave={({ username = '' }) => {
          const next = username.trim().toLowerCase();
          return USERNAME_PATTERN.test(next) && next !== user?.username && availability?.available === true;
        }}
        onChange={onUsernameChange}
        hint={usernameHint()}
        hintError={badUsername || availability?.available === false}
        error={error}
        busy={busy}
        onSave={saveUsername}
        onClose={close}
      />
      <FieldSheet
        visible={open === 'email'}
        title="Email"
        fields={[
          { key: 'email', value: user?.email || '', placeholder: 'New email', autoCapitalize: 'none', keyboardType: 'email-address', textContentType: 'emailAddress' },
          { key: 'password', placeholder: 'Current password', secure: true, autoCapitalize: 'none', textContentType: 'password' },
        ]}
        canSave={({ email = '', password = '' }) => {
          const next = email.trim().toLowerCase();
          return EMAIL_PATTERN.test(next) && next !== (user?.email || '') && password.length > 0;
        }}
        onChange={() => setError(null)}
        error={error}
        busy={busy}
        onSave={saveEmail}
        onClose={close}
      />
      <FieldSheet
        visible={open === 'password'}
        title="Password"
        fields={[
          { key: 'current', placeholder: 'Current password', secure: true, autoCapitalize: 'none', textContentType: 'password' },
          { key: 'next', placeholder: 'New password', secure: true, autoCapitalize: 'none', textContentType: 'newPassword' },
          { key: 'again', placeholder: 'New password again', secure: true, autoCapitalize: 'none', textContentType: 'newPassword' },
        ]}
        canSave={({ current = '', next = '', again = '' }) => (
          current.length > 0 && next.length >= MIN_PASSWORD && next === again
        )}
        hint={`At least ${MIN_PASSWORD} characters.`}
        onChange={() => setError(null)}
        error={error}
        busy={busy}
        onSave={savePassword}
        onClose={close}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
  },
  // iPad: one 500pt column, as Settings' columns are.
  column: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
});

export default EditProfileScreen;
