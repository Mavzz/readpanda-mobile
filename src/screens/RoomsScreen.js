import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { showToast } from '../components/Toaster';
import log from '../utils/logger';
import useRoomStore from '../stores/roomStore';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';

// Merges the old Join Room + My Rooms tabs — invite-only clubs, one place.
// See design_handoff_redesign § 1c.
const RoomsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const rooms = useRoomStore((s) => s.rooms);
  const loading = useRoomStore((s) => s.loading);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);
  const joinRoomByCode = useRoomStore((s) => s.joinRoomByCode);
  const [inviteCode, setInviteCode] = useState('');
  const codeInputRef = useRef(null);

  // The first-run nudges on Home and the Reading tab (FIRST_RUN_3a_3b.md
  // § 3a/3b) send the reader here with the code field already focused. The
  // field isn't mounted yet at the moment the tab takes focus, hence the
  // short delay; the param is cleared afterwards — not before, or clearing it
  // would re-run this effect and cancel its own timer — so coming back to the
  // tab later doesn't pop the keyboard again.
  useFocusEffect(
    useCallback(() => {
      if (!route.params?.focusCode) {
        return undefined;
      }
      const timer = setTimeout(() => {
        codeInputRef.current?.focus();
        navigation.setParams({ focusCode: undefined });
      }, 250);
      return () => clearTimeout(timer);
    }, [route.params?.focusCode, navigation]),
  );

  const loadRooms = async (showRefresh = false) => {
    const { status } = await fetchRooms();
    if (showRefresh) {
      if (status === 200) {
        showToast('Rooms refreshed', 'success');
      } else {
        showToast('Connection error. Please try again.', 'error');
      }
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = () => {
    navigation.navigate('CreateRoomScreen');
  };

  const handleJoinRoom = async () => {
    const code = inviteCode.trim();
    if (!code) {
      return;
    }
    log.info('Join room pressed with code:', code);

    const { status, response, error } = await joinRoomByCode(code);
    if (status === 200) {
      setInviteCode('');
      showToast(`Joined ${response.name}`, 'success');
      navigation.navigate('RoomLobbyScreen', { room: response });
    } else {
      showToast(error || 'Could not join that room', 'error');
    }
  };

  const openRoom = (room) => {
    navigation.navigate('RoomLobbyScreen', { room });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Rooms</Text>
          <Text style={styles.subtitle}>Private clubs with your people — no set meeting time.</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => loadRooms(true)}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      >
        {/* ── Action row ─────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <View style={styles.inviteField}>
            <Icon name="key-outline" size={16} color={DS.colors.onSurfaceVariant} />
            <TextInput
              ref={codeInputRef}
              style={styles.inviteInput}
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              placeholder="Enter invite code"
              placeholderTextColor={DS.colors.onSurfaceVariant}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              onSubmitEditing={handleJoinRoom}
              returnKeyType="join"
            />
          </View>
          <GradientPill onPress={handleCreateRoom} style={styles.newButton}>
            <Icon name="add" size={17} color={DS.colors.onPrimary} />
            <Text style={styles.newButtonText}>New</Text>
          </GradientPill>
        </View>

        {/* ── Room list ──────────────────────────────────────── */}
        {rooms.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Your rooms</Text>
            {rooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                style={styles.roomCard}
                activeOpacity={0.85}
                onPress={() => openRoom(room)}
              >
                <BookCoverGradient
                  coverUrl={room.coverUrl}
                  title={room.currentBookTitle}
                  width={56}
                  height={78}
                  borderRadius={12}
                  titleFontSize={8}
                />
                <View style={styles.roomInfo}>
                  <View style={styles.roomNameRow}>
                    <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                    {room.unreadCount > 0 && (
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>{room.unreadCount} new</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.roomMeta} numberOfLines={1}>
                    {room.currentBookTitle || 'No book yet'}{room.status ? ` · ${room.status}` : ''}
                  </Text>
                  <View style={styles.memberRow}>
                    <View style={styles.avatarStack}>
                      {(room.members || []).slice(0, 3).map((m, i) => (
                        <View
                          key={m.userId}
                          style={[
                            styles.memberAvatar,
                            i > 0 && styles.memberAvatarOverlap,
                            m.isMe && styles.memberAvatarMe,
                          ]}
                        >
                          <Text style={m.isMe ? styles.memberAvatarTextMe : styles.memberAvatarText}>
                            {m.initials}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.groupTrack}>
                      <View style={[styles.groupFill, { width: `${room.groupProgressPct}%` }]} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        {/* ── Empty / invite state ───────────────────────────── */}
        <View style={styles.inviteCard}>
          <Icon name="mail-open-outline" size={28} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.inviteCardTitle}>Invite a friend</Text>
          <Text style={styles.inviteCardBody}>
            Rooms are invite-only. Share a code and read the same book on your own schedules.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  safeTop: {
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerBlock: {
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  title: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 18,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    marginBottom: 26,
  },
  inviteField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DS.colors.surfaceContainerLowest,
    borderRadius: DS.radius.md,
    paddingHorizontal: 16,
  },
  inviteInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurface,
    paddingVertical: 13,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: DS.radius.full,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  newButtonText: {
    fontSize: 14,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },

  // Room list
  sectionLabel: {
    fontSize: 13,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginBottom: 12,
  },
  roomCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 16,
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  roomNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  roomName: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: DS.colors.primaryContainer,
    borderRadius: DS.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  roomMeta: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  memberAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: DS.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarOverlap: {
    marginLeft: -6,
  },
  memberAvatarMe: {
    backgroundColor: DS.colors.primary,
  },
  memberAvatarText: {
    fontSize: 8,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  memberAvatarTextMe: {
    fontSize: 8,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  groupTrack: {
    flex: 1,
    height: 3,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },
  groupFill: {
    height: '100%',
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.full,
  },

  // Invite card
  inviteCard: {
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.surfaceContainerLow,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  inviteCardTitle: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  inviteCardBody: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 240,
  },
});

export default RoomsScreen;
