import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { showToast } from '../../components/Toaster';
import useAuthStore from '../../stores/authStore';
import { logout } from '../../services/auth';
import { unregisterPushDevice } from '../../hooks/usePushNotifications';
import enhancedStorage from '../../utils/enhancedStorage';
import log from '../../utils/logger';
import { useScreenTracking } from '../../utils/screenTracking';
import { READER_SETTINGS, labelForSetting, useReaderSetting } from '../../utils/readerSettings';
import { DS } from '../../styles/global';
import useSubscriptionStore from '../../stores/subscriptionStore';
import packageJson from '../../../package.json';
import profileStyles from './profileStyles';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { ChoiceSheet, ConfirmSheet } from './SettingsSheets';
import PressableScale from '../../components/PressableScale';

const CHOICE_TITLES = {
  pageMode: 'Page turning',
  pageTheme: 'Page theme',
  progressVisibility: 'Who sees my progress',
};

// Interests come back as { category: [{ preference_value, ... }] }.
const pickedGenreCount = (preferences) => Object.values(preferences || {})
  .flat()
  .filter((p) => p?.preference_value).length;

const SettingsScreen = () => {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isPlus = useSubscriptionStore((s) => s.isPlus);

  const [pageMode, setPageMode] = useReaderSetting('pageMode');
  const [pageTheme, setPageTheme] = useReaderSetting('pageTheme');
  const [progressVisibility, setProgressVisibility] = useReaderSetting('progressVisibility');
  const [spoilerProtection, setSpoilerProtection] = useReaderSetting('spoilerProtection');

  // Which ChoiceSheet / ConfirmSheet is open, if any.
  const [choice, setChoice] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useScreenTracking('SettingsScreen');

  const choiceState = {
    pageMode: [pageMode, setPageMode],
    pageTheme: [pageTheme, setPageTheme],
    progressVisibility: [progressVisibility, setProgressVisibility],
  };

  const genres = pickedGenreCount(user?.preferences);

  const handleSignOut = async () => {
    setConfirm(null);
    log.info('Signing out...');
    // Before logout: this needs the access token that signOut clears.
    await unregisterPushDevice();
    await logout(user?.username, enhancedStorage.getRefreshToken());
    signOut();
    log.info('User signed out successfully');
  };

  // There is no account-deletion endpoint yet; the flow itself is out of
  // scope for 7b, so confirming says so instead of pretending.
  const handleDeleteAccount = () => {
    setConfirm(null);
    showToast('Account deletion isn\'t available in the app yet — contact support', 'info', 4000);
  };

  const comingSoon = (what) => () => showToast(`${what} is coming soon`, 'info');

  return (
    <SafeAreaView style={profileStyles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView contentContainerStyle={profileStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={profileStyles.circleButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </PressableScale>
          <Text style={styles.title}>Settings</Text>
        </View>

        <SettingsGroup title="ReadPanda+">
          <SettingsRow
            icon="sparkles-outline"
            label="ReadPanda+"
            value={isPlus ? 'Active' : 'Free plan'}
            onPress={() => navigation.navigate('Paywall', { reason: 'settings' })}
          />
        </SettingsGroup>

        <SettingsGroup title="Reading">
          <SettingsRow
            icon="swap-vertical-outline"
            label="Page turning"
            value={labelForSetting('pageMode', pageMode)}
            onPress={() => setChoice('pageMode')}
          />
          <SettingsRow
            icon="contrast-outline"
            label="Page theme"
            value={labelForSetting('pageTheme', pageTheme)}
            onPress={() => setChoice('pageTheme')}
          />
          <SettingsRow
            icon="pricetags-outline"
            label="Genres I like"
            value={`${genres} picked`}
            onPress={() => navigation.navigate('Interest')}
          />
        </SettingsGroup>

        <SettingsGroup title="Rooms & privacy">
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            value="Comments, nudges"
            // The detail screen is out of scope; the system settings are
            // where they're switched today.
            onPress={() => Linking.openSettings()}
          />
          <SettingsRow
            icon="eye-outline"
            label="Who sees my progress"
            value={labelForSetting('progressVisibility', progressVisibility)}
            onPress={() => setChoice('progressVisibility')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Spoiler protection"
            switchValue={spoilerProtection === 'on'}
            onSwitchChange={(on) => setSpoilerProtection(on ? 'on' : 'off')}
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow icon="help-buoy-outline" label="Help & support" onPress={comingSoon('Help & support')} />
          <SettingsRow
            icon="document-text-outline"
            label="Terms & privacy policy"
            onPress={comingSoon('Terms & privacy policy')}
          />
        </SettingsGroup>

        <View style={[profileStyles.groupCard, styles.accountCard]}>
          <Pressable
            onPress={() => setConfirm('signOut')}
            style={({ pressed }) => [styles.accountRow, pressed && styles.accountRowPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
          <View style={styles.accountDivider} />
          <Pressable
            onPress={() => setConfirm('delete')}
            style={({ pressed }) => [styles.accountRow, pressed && styles.accountRowPressed]}
            accessibilityRole="button"
          >
            <Text style={styles.deleteAccount}>Delete account</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>ReadPanda {packageJson.version}</Text>
      </ScrollView>

      <ChoiceSheet
        visible={!!choice}
        title={choice ? CHOICE_TITLES[choice] : ''}
        options={choice ? READER_SETTINGS[choice].options : []}
        value={choice ? choiceState[choice][0] : null}
        onSelect={(value) => {
          choiceState[choice][1](value);
          setChoice(null);
        }}
        onClose={() => setChoice(null)}
      />

      <ConfirmSheet
        visible={confirm === 'signOut'}
        title="Sign out?"
        message="Your reading positions stay on this device for when you're back."
        confirmLabel="Sign out"
        onConfirm={handleSignOut}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === 'delete'}
        title="Delete account?"
        message="Your rooms, comments and reading history will be removed. This can't be undone."
        confirmLabel="Delete account"
        destructive
        onConfirm={handleDeleteAccount}
        onClose={() => setConfirm(null)}
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

  accountCard: {
    marginTop: 24,
  },
  accountRow: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountRowPressed: {
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: DS.colors.outlineVariant,
  },
  signOut: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  deleteAccount: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.error,
  },

  footer: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 24,
  },
});

export default SettingsScreen;
