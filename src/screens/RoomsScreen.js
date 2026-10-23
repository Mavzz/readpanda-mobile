import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
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
import useAuthStore from '../stores/authStore';
import usePlusGate from '../hooks/usePlusGate';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import haptics from '../utils/haptics';
import ProgressFill from '../components/ProgressFill';
import RollingCount from '../components/RollingCount';
import useLayout from '../hooks/useLayout';
import OpenRoomCard from '../components/OpenRoomCard';
import OpenRoomSheet from '../components/OpenRoomSheet';

// Merges the old Join Room + My Rooms tabs: your rooms, then open rooms you
// could join. See design_handoff_redesign § 1c and specs/open-rooms.
const CARD_GAP = 16;
// Two show; asking for three says whether See all is needed.
const OPEN_ROOMS_SHOWN = 2;

const RoomsScreen = () => {
  const navigation = useNavigation();
  const gate = usePlusGate();
  const route = useRoute();
  const rooms = useRoomStore((s) => s.rooms);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);
  const joinRoomByCode = useRoomStore((s) => s.joinRoomByCode);
  const fetchOpenRooms = useRoomStore((s) => s.fetchOpenRooms);
  // This tab's own list (the store doesn't keep one). Empty hides the
  // section, which is also what a failed load does.
  const [openRooms, setOpenRooms] = useState([]);
  const [previewRoom, setPreviewRoom] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  // Local, not the store's `loading`: Home refreshes rooms too, and that
  // shouldn't spin this tab's pull-to-refresh indicator.
  const [refreshing, setRefreshing] = useState(false);
  const { width, isLarge, pagePad } = useLayout();
  // 15i: a 2-column grid of the same cards on iPad.
  const cardWidth = isLarge ? (width - pagePad * 2 - CARD_GAP) / 2 : undefined;
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

  const loadOpenRooms = useCallback(async () => {
    const { status, rooms: found } = await fetchOpenRooms({ limit: OPEN_ROOMS_SHOWN + 1 });
    setOpenRooms(status === 200 ? found : []);
  }, [fetchOpenRooms]);

  const loadRooms = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }
    // The toast is about the reader's own rooms; open rooms just hide if
    // they can't load.
    const [{ status }] = await Promise.all([fetchRooms(), loadOpenRooms()]);
    if (showRefresh) {
      setRefreshing(false);
      // Signed out mid-refresh (a suspended account, report-block R10.2):
      // the alert says what happened.
      if (!useAuthStore.getState().isAuthenticated) {
        return;
      }
      if (status === 200) {
        showToast('Rooms refreshed', 'success');
      } else {
        showToast('Connection error. Please try again.', 'error');
      }
    }
  };

  // Every focus, not just mount: the tab stays mounted, and the cards' group
  // track is everyone's live position — reading a room's book and coming back
  // should move it without a pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      fetchRooms();
      loadOpenRooms();
    }, [fetchRooms, loadOpenRooms]),
  );

  const handleCreateRoom = () => {
    gate('rooms', () => navigation.navigate('CreateRoomScreen'));
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
      haptics.success();
      showToast(`Joined ${response.name}`, 'success');
      navigation.navigate('RoomLobbyScreen', { room: response });
    } else {
      showToast(error || 'Could not join that room', 'error');
    }
  };

  const openRoom = (room) => {
    navigation.navigate('RoomLobbyScreen', { room });
  };

  const handleOpenRoomJoined = (room) => {
    setPreviewRoom(null);
    showToast(`Joined ${room.name}`, 'success');
    openRoom(room);
  };

  // The room changed under the preview (closed or deleted); the sheet has
  // said so, and the list should stop offering it.
  const handleOpenRoomStale = () => {
    setPreviewRoom(null);
    loadOpenRooms();
  };

  const renderRoom = ({ item: room }) => (
    <TouchableOpacity
      style={[styles.roomCard, isLarge && styles.roomCardLarge, isLarge && { width: cardWidth }]}
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
              <RollingCount value={room.unreadCount} style={styles.newBadgeText} />
              <Text style={styles.newBadgeText}> new</Text>
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
            <ProgressFill pct={room.groupProgressPct} seenKey={`room:${room.id}`} style={styles.groupFill} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  log.debug('RoomsDetails', { rooms, refreshing, inviteCode });

  // Join-by-code and New. On iPad (15i) they move up into the title row.
  const actions = (
    <View style={[styles.actionRow, isLarge && styles.actionRowLarge]}>
      <View style={[styles.inviteField, isLarge && styles.inviteFieldLarge]}>
        <Icon name="key-outline" size={16} color={DS.colors.onSurfaceVariant} />
        <TextInput
          ref={codeInputRef}
          style={styles.inviteInput}
          value={inviteCode}
          onChangeText={(t) => setInviteCode(t.toUpperCase())}
          placeholder="Enter invite code"
          placeholderTextColor={DS.colors.placeholder}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={handleJoinRoom}
          returnKeyType="join"
        />
      </View>
      <GradientPill onPress={handleCreateRoom} style={styles.newButton}>
        <Icon name="add" size={17} color={DS.colors.onPrimary} />
        <Text style={styles.newButtonText}>{isLarge ? 'New room' : 'New'}</Text>
      </GradientPill>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={[styles.headerBlock, isLarge && styles.headerBlockLarge, isLarge && { paddingHorizontal: pagePad }]}>
          <View style={isLarge && styles.headerText}>
            <Text style={[styles.title, isLarge && styles.titleLarge]}>Rooms</Text>
            <Text style={styles.subtitle}>Read with your people, or join an open room. No set meeting time.</Text>
          </View>
          {isLarge ? actions : null}
        </View>
      </SafeAreaView>

      <FlatList
        // numColumns can't change on a mounted list; a new layout remounts it.
        key={isLarge ? 'grid' : 'list'}
        numColumns={isLarge ? 2 : 1}
        columnWrapperStyle={isLarge ? styles.cardRow : undefined}
        data={rooms}
        keyExtractor={(room) => String(room.id)}
        renderItem={renderRoom}
        style={styles.content}
        contentContainerStyle={[styles.contentInner, isLarge && { paddingHorizontal: pagePad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRooms(true)}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {isLarge ? null : actions}

            {rooms.length > 0 ? <Text style={styles.sectionLabel}>Your rooms</Text> : null}
          </>
        }
        ListFooterComponent={
          <>
            {openRooms.length > 0 ? (
              <View style={styles.openSection}>
                <View style={styles.openHeader}>
                  <Text style={[styles.sectionLabel, styles.openLabel]} accessibilityRole="header">
                    Open rooms
                  </Text>
                  {openRooms.length > OPEN_ROOMS_SHOWN ? (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('OpenRooms')}
                      hitSlop={10}
                      accessibilityRole="button"
                    >
                      <Text style={styles.seeAll}>See all</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <View style={isLarge && styles.openGrid}>
                  {openRooms.slice(0, OPEN_ROOMS_SHOWN).map((room) => (
                    <OpenRoomCard
                      key={room.id}
                      room={room}
                      onPress={setPreviewRoom}
                      style={isLarge && [styles.roomCardLarge, { width: cardWidth }]}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* ── Empty / invite state ───────────────────────────── */}
            <View style={styles.inviteCard}>
              <Icon name="mail-open-outline" size={28} color={DS.colors.onSurfaceVariant} />
              <Text style={styles.inviteCardTitle}>Invite a friend</Text>
              <Text style={styles.inviteCardBody}>
                Share a code and read the same book on your own schedules.
              </Text>
            </View>
          </>
        }
      />

      <OpenRoomSheet
        room={previewRoom}
        visible={!!previewRoom}
        onClose={() => setPreviewRoom(null)}
        onJoined={handleOpenRoomJoined}
        onStale={handleOpenRoomStale}
      />
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
  headerBlockLarge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 20,
    paddingBottom: 24,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  titleLarge: {
    ...DS.type.pageTitleLarge,
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
  actionRowLarge: {
    marginTop: 0,
    marginBottom: 0,
  },
  inviteFieldLarge: {
    flex: 0,
    width: 280,
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
  cardRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  roomCardLarge: {
    marginBottom: 0,
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
    flexDirection: 'row',
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

  // Open rooms
  openSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  openHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  openLabel: {
    marginBottom: 0,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  openGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
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
