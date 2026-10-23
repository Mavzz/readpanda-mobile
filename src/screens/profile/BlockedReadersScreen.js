import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import PressableScale from '../../components/PressableScale';
import useBlocksStore from '../../stores/blocksStore';
import useSafetyActions from '../../hooks/useSafetyActions';
import useLayout from '../../hooks/useLayout';
import { useScreenTracking } from '../../utils/screenTracking';
import getInitials from '../../utils/getInitials';
import { DS } from '../../styles/global';
import profileStyles from './profileStyles';
import { SettingsGroup } from './SettingsRow';

// Settings → Rooms & privacy → Blocked readers (report-block R6): who you've
// blocked, and Unblock. Built like NotificationSettingsScreen; no handoff.
const BlockedReadersScreen = () => {
  const { isLarge, pagePad } = useLayout();
  const navigation = useNavigation();
  const blocked = useBlocksStore((s) => s.blocked);
  const loaded = useBlocksStore((s) => s.loaded);
  const fetchBlocks = useBlocksStore((s) => s.fetch);
  const { unblockUser } = useSafetyActions();
  const [failed, setFailed] = useState(false);
  // Rows mid-unblock, so a second tap can't send it twice.
  const [busy, setBusy] = useState({});

  useScreenTracking('BlockedReadersScreen');

  const load = useCallback(async () => {
    setFailed(false);
    const { ok } = await fetchBlocks();
    setFailed(!ok);
  }, [fetchBlocks]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const unblock = async (person) => {
    setBusy((b) => ({ ...b, [person.userId]: true }));
    await unblockUser(person);
    setBusy((b) => ({ ...b, [person.userId]: false }));
  };

  let body;
  if (!loaded && failed) {
    body = (
      <View style={styles.message}>
        <Text style={styles.messageText}>Couldn't load blocked readers.</Text>
        <Pressable onPress={load} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>Try again</Text>
        </Pressable>
      </View>
    );
  } else if (!loaded) {
    body = (
      <View style={styles.loading}>
        <ActivityIndicator color={DS.colors.primary} />
      </View>
    );
  } else if (blocked.length === 0) {
    // R6.4: and where Block is.
    body = (
      <View style={[profileStyles.groupCard, styles.empty]}>
        <Icon name="hand-left-outline" size={22} color={DS.colors.onSurfaceVariant} />
        <Text style={styles.emptyTitle}>You haven't blocked anyone.</Text>
        <Text style={styles.emptyBody}>
          To block someone, tap ⋯ on their comment or their name in a room.
        </Text>
      </View>
    );
  } else {
    body = (
      <SettingsGroup title={`${blocked.length} blocked`}>
        {blocked.map((person) => (
          <View key={person.userId} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(person.username)}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>{person.username}</Text>
            <Pressable
              onPress={() => unblock(person)}
              disabled={!!busy[person.userId]}
              hitSlop={8}
              style={styles.unblock}
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${person.username}`}
              accessibilityState={{ busy: !!busy[person.userId] }}
            >
              {busy[person.userId]
                ? <ActivityIndicator size="small" color={DS.colors.primary} />
                : <Text style={styles.link}>Unblock</Text>}
            </Pressable>
          </View>
        ))}
      </SettingsGroup>
    );
  }

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
            <Text style={styles.title} accessibilityRole="header">Blocked readers</Text>
          </View>

          {body}

          <Text style={styles.footnote}>
            You won't see their comments or the open rooms they start, and they aren't told.
            Unblocking shows their comments again.
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
  },
  unblock: {
    minWidth: 64,
    minHeight: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  link: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  loading: {
    marginTop: 48,
    alignItems: 'center',
  },
  message: {
    marginTop: 48,
    alignItems: 'center',
    gap: 10,
  },
  messageText: {
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  empty: {
    marginTop: 24,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    textAlign: 'center',
  },
  emptyBody: {
    ...DS.type.body,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  footnote: {
    marginTop: 12,
    marginHorizontal: 4,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default BlockedReadersScreen;
