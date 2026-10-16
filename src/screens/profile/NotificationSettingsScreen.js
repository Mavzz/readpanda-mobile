import { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { showToast } from '../../components/Toaster';
import { iconForType } from '../../components/NotificationList';
import PressableScale from '../../components/PressableScale';
import useNotificationStore, { NOTIFICATION_SETTINGS } from '../../stores/notificationStore';
import useNotificationPermission from '../../hooks/useNotificationPermission';
import useLayout from '../../hooks/useLayout';
import { useScreenTracking } from '../../utils/screenTracking';
import { DS } from '../../styles/global';
import profileStyles from './profileStyles';
import { SettingsGroup, SettingsRow } from './SettingsRow';

// Each switch, with the icon its notifications have in the inbox.
const ROWS = {
  replies: { label: 'Replies to you', type: 'REPLY' },
  roomComments: { label: 'Room comments', type: 'ROOM_COMMENTS' },
  roomJoins: { label: 'New members', type: 'ROOM_JOIN' },
  roomBook: { label: 'Room picks a book', type: 'ROOM_BOOK' },
  newBooks: { label: 'New books', type: 'NEW_BOOK' },
};

// Behind Settings → Notifications: one switch per kind, saved on the server so
// a switched-off kind stops at the source. No handoff screen; it follows 7b.
const NotificationSettingsScreen = () => {
  const { isLarge, pagePad } = useLayout();
  const navigation = useNavigation();
  const settings = useNotificationStore((s) => s.settings);
  const fetchSettings = useNotificationStore((s) => s.fetchSettings);
  const setSetting = useNotificationStore((s) => s.setSetting);
  const permitted = useNotificationPermission();

  useScreenTracking('NotificationSettingsScreen');

  useFocusEffect(useCallback(() => {
    fetchSettings();
  }, [fetchSettings]));

  const toggle = async (key, on) => {
    const saved = await setSetting(key, on);
    if (!saved) {
      showToast('Couldn\'t save. Try again.', 'error');
    }
  };

  return (
    <SafeAreaView style={profileStyles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView
        contentContainerStyle={[profileStyles.content, isLarge && { paddingHorizontal: pagePad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 15m: Settings' 500pt column, so no row stretches across an iPad. */}
        <View style={isLarge && styles.column}>
          <View style={styles.nav}>
            <PressableScale
              onPress={() => navigation.goBack()}
              style={profileStyles.circleButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
            </PressableScale>
            <Text style={styles.title}>Notifications</Text>
          </View>

          {permitted === false ? (
            <View style={[profileStyles.groupCard, styles.banner]}>
              <Icon name="notifications-off-outline" size={18} color={DS.colors.primary} />
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Notifications are off for ReadPanda in iOS Settings</Text>
                <Pressable onPress={() => Linking.openSettings()} hitSlop={10} accessibilityRole="link">
                  <Text style={styles.bannerLink}>Open Settings</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {settings ? (
            <SettingsGroup title="Notify me about">
              {NOTIFICATION_SETTINGS.map((key) => (
                <SettingsRow
                  key={key}
                  icon={iconForType(ROWS[key].type)}
                  label={ROWS[key].label}
                  switchValue={settings[key]}
                  onSwitchChange={(on) => toggle(key, on)}
                />
              ))}
            </SettingsGroup>
          ) : (
            <View style={styles.loading}>
              <ActivityIndicator color={DS.colors.primary} />
            </View>
          )}

          <Text style={styles.footnote}>
            Turning one off stops its pushes and its rows in your inbox.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
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
  banner: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  bannerText: {
    flex: 1,
    gap: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
  },
  bannerLink: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  loading: {
    marginTop: 48,
    alignItems: 'center',
  },
  footnote: {
    marginTop: 12,
    marginHorizontal: 4,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default NotificationSettingsScreen;
