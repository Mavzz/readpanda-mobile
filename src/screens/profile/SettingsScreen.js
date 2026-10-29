import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { showToast } from '../../components/Toaster';
import useAuthStore from '../../stores/authStore';
import { logout, deleteAccount } from '../../services/auth';
import { unregisterPushDevice } from '../../hooks/usePushNotifications';
import enhancedStorage from '../../utils/enhancedStorage';
import log from '../../utils/logger';
import { useScreenTracking } from '../../utils/screenTracking';
import { isSentryEnabled } from '../../utils/sentry';
import { openLegalPage } from '../../utils/legalLinks';
import { READER_SETTINGS, labelForSetting, useReaderSetting } from '../../utils/readerSettings';
import { DS } from '../../styles/global';
import useSubscriptionStore from '../../stores/subscriptionStore';
import { isPlusEnabled } from '../../services/purchasesService';
import useNotificationStore, { summarizeSettings } from '../../stores/notificationStore';
import useNotificationPermission from '../../hooks/useNotificationPermission';
import useBlocksStore from '../../stores/blocksStore';
import packageJson from '../../../package.json';
import useLayout from '../../hooks/useLayout';
import profileStyles from './profileStyles';
import { SettingsGroup, SettingsRow } from './SettingsRow';
import { BugReportSheet, ChoiceSheet, ConfirmSheet } from './SettingsSheets';
import PressableScale from '../../components/PressableScale';
import useOutboxStore from '../../stores/outboxStore';

const CHOICE_TITLES = {
  pageMode: 'Page turning',
  pageTheme: 'Page theme',
};

// Interests come back as { category: [{ preference_value, ... }] }.
const pickedGenreCount = (preferences) => Object.values(preferences || {})
  .flat()
  .filter((p) => p?.preference_value).length;

// R3.8: "1 change hasn't synced yet", "3 changes haven't synced yet".
export const signOutUnsentTitle = (n) => (
  n === 1 ? '1 change hasn\'t synced yet' : `${n} changes haven't synced yet`
);

const SettingsScreen = () => {
  const { isLarge, pagePad } = useLayout();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isPlus = useSubscriptionStore((s) => s.isPlus);
  const notificationSettings = useNotificationStore((s) => s.settings);
  const fetchNotificationSettings = useNotificationStore((s) => s.fetchSettings);
  const notificationsPermitted = useNotificationPermission();
  const blockedCount = useBlocksStore((s) => (s.loaded ? s.blocked.length : null));
  const fetchBlocks = useBlocksStore((s) => s.fetch);

  // On focus, so the rows' values are current after coming back from the
  // Notifications and Blocked readers screens.
  useFocusEffect(useCallback(() => {
    fetchNotificationSettings();
    fetchBlocks();
  }, [fetchNotificationSettings, fetchBlocks]));

  const [pageMode, setPageMode] = useReaderSetting('pageMode');
  const [pageTheme, setPageTheme] = useReaderSetting('pageTheme');

  // Which ChoiceSheet / ConfirmSheet is open, if any.
  const [choice, setChoice] = useState(null);
  const [confirm, setConfirm] = useState(null);
  // Offline changes not yet sent, which signing out would lose (R3.8).
  const unsent = useOutboxStore((s) => s.items.length);
  const [deleting, setDeleting] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

  useScreenTracking('SettingsScreen');

  const choiceState = {
    pageMode: [pageMode, setPageMode],
    pageTheme: [pageTheme, setPageTheme],
  };

  const genres = pickedGenreCount(user?.preferences);

  const handleSignOut = async () => {
    setConfirm(null);
    log.info('Signing out...');
    // Before logout: this needs the access token that signOut clears.
    await unregisterPushDevice();
    await logout(user?.username, enhancedStorage.getRefreshToken());
    // What was done offline and never sent goes too: the reader was told
    // (specs/offline-first R3.8). Cleared while still signed in, so the
    // account's stored copy is emptied, not just the one in memory.
    useOutboxStore.getState().clearOutbox();
    signOut();
    log.info('User signed out successfully');
  };

  // Account deletion (account-deletion R3). The sheet stays up with a spinner
  // until the server answers, then closes either way: a Modal sits above the
  // toasts, so they'd be hidden behind it.
  const handleDeleteAccount = async () => {
    if (deleting) {
      return;
    }
    setDeleting(true);
    const { ok } = await deleteAccount();
    setDeleting(false);
    setConfirm(null);
    if (!ok) {
      // Still signed in, nothing cleared (R3.2).
      showToast('Couldn\u2019t delete your account. Try again.', 'error');
      return;
    }
    // The same local cleanup as Sign out — session, stores, cached data,
    // RevenueCat — which also returns to Login (R3.1). Not the server logout
    // or the push unregister: the account and its tokens are already gone.
    // Unlike signing out, what the account stored on this device goes too.
    log.info('Account deleted; signing out locally');
    enhancedStorage.clearAccountData(user?.username);
    signOut();
    showToast('Your account has been deleted.', 'success');
  };

  // Hidden while ReadPanda+ is off: it's the only way to the paywall
  // outside the free limits.
  const plusGroup = isPlusEnabled ? (
    <SettingsGroup title="ReadPanda+">
      <SettingsRow
        icon="sparkles-outline"
        label="ReadPanda+"
        value={isPlus ? 'Active' : 'Free plan'}
        onPress={() => navigation.navigate('Paywall', { reason: 'settings' })}
      />
    </SettingsGroup>
  ) : null;

  const readingGroup = (
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
        onPress={() => navigation.navigate('Interest', { from: 'settings' })}
      />
    </SettingsGroup>
  );

  // No "Who sees my progress" or "Spoiler protection": seeing each other's
  // progress is what a room is for, and the server always holds back comments
  // you haven't reached, so neither had anything to switch off.
  const roomsGroup = (
    <SettingsGroup title="Rooms & privacy">
      <SettingsRow
        icon="notifications-outline"
        label="Notifications"
        value={summarizeSettings(notificationSettings, notificationsPermitted)}
        onPress={() => navigation.navigate('NotificationSettings')}
      />
      <SettingsRow
        icon="hand-left-outline"
        label="Blocked readers"
        value={blockedCount === null ? undefined : blockedCount === 0 ? 'None' : String(blockedCount)}
        onPress={() => navigation.navigate('BlockedReaders')}
      />
    </SettingsGroup>
  );

  const aboutGroup = (
    <SettingsGroup title="About">
      <SettingsRow icon="help-buoy-outline" label="Help & support" onPress={() => navigation.navigate('Help')} />
      {/* Reports go to Sentry, so with no DSN there's nowhere to send one. */}
      {isSentryEnabled ? (
        <SettingsRow icon="bug-outline" label="Report a bug" onPress={() => setBugReportOpen(true)} />
      ) : null}
      <SettingsRow icon="document-text-outline" label="Terms of use" onPress={() => openLegalPage('terms')} />
      <SettingsRow icon="lock-closed-outline" label="Privacy policy" onPress={() => openLegalPage('privacy')} />
    </SettingsGroup>
  );
  // Sign out and Delete account stay last, both behind a confirmation.
  const accountGroup = (
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
  );

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
          <Text style={styles.title}>Settings</Text>
        </View>

        {isLarge ? (
          // 15m: the same rows in two 500pt columns, so no row stretches.
          <View style={styles.columns}>
            <View style={styles.column}>
              {plusGroup}
              {readingGroup}
              {aboutGroup}
            </View>
            <View style={styles.column}>
              {roomsGroup}
              {accountGroup}
            </View>
          </View>
        ) : (
          <>
            {plusGroup}
            {readingGroup}
            {roomsGroup}
            {aboutGroup}
            {accountGroup}
          </>
        )}

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

      <BugReportSheet
        visible={bugReportOpen}
        onSent={() => {
          setBugReportOpen(false);
          showToast('Thanks \u2014 your report was sent', 'success');
        }}
        onClose={() => setBugReportOpen(false)}
      />

      <ConfirmSheet
        visible={confirm === 'signOut'}
        title={unsent > 0 ? signOutUnsentTitle(unsent) : 'Sign out?'}
        message={unsent > 0
          ? 'Sign out anyway? What you did offline will be lost.'
          : 'Your reading positions stay on this device for when you\'re back.'}
        confirmLabel="Sign out"
        destructive={unsent > 0}
        onConfirm={handleSignOut}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === 'delete'}
        title="Delete account?"
        message={'Your reading history, buckets and highlights are deleted. Rooms you created pass to another member, and your comments stay as “Deleted reader”. This can’t be undone.'}
        confirmLabel="Delete account"
        destructive
        busy={deleting}
        onConfirm={handleDeleteAccount}
        onClose={() => setConfirm(null)}
      >
        {/* Only Apple can cancel a subscription, so say so and send them
            there; it doesn't stop the deletion (R2.1, R2.2). */}
        {isPlusEnabled && isPlus ? (
          <View style={styles.plusNote}>
            <Text style={styles.plusNoteText}>Deleting your account doesn{'’'}t cancel ReadPanda+.</Text>
            <Pressable
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
              hitSlop={10}
              accessibilityRole="link"
            >
              <Text style={styles.plusNoteLink}>Manage subscription</Text>
            </Pressable>
          </View>
        ) : null}
      </ConfirmSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 28,
  },
  column: {
    flex: 1,
    maxWidth: 500,
  },
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

  // Delete account's ReadPanda+ note: a tonal panel, no border.
  plusNote: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.surfaceContainer,
    alignItems: 'center',
    gap: 6,
  },
  plusNoteText: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
    textAlign: 'center',
  },
  plusNoteLink: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default SettingsScreen;
