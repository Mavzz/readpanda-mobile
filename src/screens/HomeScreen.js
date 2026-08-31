import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StatusBar,
  RefreshControl,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useState, useEffect, useRef } from 'react';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toaster';
import { DS } from '../styles/global';
import getInitials from '../utils/getInitials';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import NotificationList from '../components/NotificationList';
import useBucketsStore from '../stores/bucketsStore';
import useRoomStore from '../stores/roomStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import useNotificationStore from '../stores/notificationStore';

// "Curated for you" cards are a fixed 58%/42% split of the section width.
// LinearGradient (the cover placeholder) needs a hard pixel height here —
// aspectRatio + a '100%' width + an undefined height doesn't resolve
// correctly for it and renders the cover hugely oversized with no title
// text, so the two card widths/heights are computed explicitly instead.
const SECTION_HPADDING = 24;
const CURATED_GAP = 12;
const CURATED_CARD_PADDING = 12;
const CURATED_COVER_ASPECT = 0.78; // width / height

// RoomLobbyScreen still expects the older snake_case room shape — bridge our
// normalized (camelCase) store room into what it reads until that screen is
// updated to the same normalizeRoom() shape.
const toRoomLobbyParams = (room) => ({
  room: {
    ...room,
    invite_code: room.inviteCode,
    current_book: room.currentBookTitle ? { title: room.currentBookTitle } : null,
    members: (room.members || []).map((m) => ({
      user_id: m.userId,
      username: m.initials,
      role: m.isMe ? 'admin' : undefined,
    })),
  },
});

const Home = ({ navigation }) => {
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const refreshing = useBucketsStore((s) => s.refreshing);
  const fetchCuratedBuckets = useBucketsStore((s) => s.fetchCuratedBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);

  const rooms = useRoomStore((s) => s.rooms);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);
  const loadFixtureRoomsIfEmpty = useRoomStore((s) => s.loadFixtureRoomsIfEmpty);

  const activeBook = useReadingProgressStore((s) => s.activeBook);
  const memberProgress = useReadingProgressStore((s) => s.memberProgress);
  const loadFixtureActiveBook = useReadingProgressStore((s) => s.loadFixtureActiveBook);

  const loadFixtureComments = useCommentsStore((s) => s.loadFixtureComments);
  const commentsWaiting = useCommentsStore((s) => s.comments.length + s.lockedComments.length);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notifLoading = useNotificationStore((s) => s.loading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const didInit = useRef(false);

  const username = user?.username || 'Reader';
  const initials = getInitials(username);

  const loadHome = async (showRefresh = false) => {
    const { status: curatedStatus } = await fetchCuratedBuckets();
    const { status: customStatus } = await fetchCustomBuckets();
    const { status: roomsStatus } = await fetchRooms();
    loadFixtureRoomsIfEmpty();
    loadFixtureActiveBook();
    loadFixtureComments();
    if (showRefresh && curatedStatus === 200 && customStatus === 200) {
      showToast('Refreshed! 📚', 'success');
    } else if (curatedStatus !== 200 && curatedStatus !== null && roomsStatus !== 200) {
      showToast('Connection error. Please try again.', 'error');
    }
  };

  const onRefresh = () => {
    loadHome(true);
  };

  useEffect(() => {
    if (!user || didInit.current) {
      log.info('No user found or already initialized, skipping home load');
      return;
    }

    if (!hasShownWelcome) {
      setTimeout(() => {
        showToast(`Welcome back, ${username}! 👋`, 'success', 4000);
        setHasShownWelcome(true);
      }, 500);
    }

    if (user.isNewUser) {
      log.info('Navigating new user to InterestScreen');
      navigation.navigate('Interest');
    } else {
      loadHome();
    }
    didInit.current = true;
  }, [user, hasShownWelcome]);

  const handleNotificationPress = () => {
    setNotifModalVisible(true);
    fetchNotifications();
  };

  const handleContinueReading = () => {
    if (!activeBook) {
      return;
    }
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: activeBook.id,
        title: activeBook.title,
        manuscript_url: activeBook.manuscriptUrl,
      },
    });
  };

  const openRoom = (room) => {
    navigation.navigate('RoomLobbyScreen', toRoomLobbyParams(room));
  };

  const openBucket = (bucket) => {
    navigation.navigate('BucketBooksScreen', {
      books_preview: bucket.booksPreview,
      name: bucket.name,
      book_count: bucket.bookCount,
    });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <View style={styles.loadingContainer}>
          <Icon name="book" size={48} color={DS.colors.primary} />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      </View>
    );
  }

  const friends = memberProgress.filter((m) => !m.isMe).sort((a, b) => b.progressPct - a.progressPct);
  const friendNames = friends.length >= 2
    ? `${friends[0].initials} & ${friends[1].initials}`
    : friends[0]?.initials;

  // See the SECTION_HPADDING/CURATED_* comment above — explicit pixel sizes
  // for the cover, computed from the same 58%/42% split the card containers
  // use via CSS percentage.
  const curatedAvailableWidth = windowWidth - SECTION_HPADDING * 2 - CURATED_GAP;
  const curatedCoverSize = (isWide) => {
    const cardWidth = curatedAvailableWidth * (isWide ? 0.58 : 0.42);
    const coverWidth = cardWidth - CURATED_CARD_PADDING * 2;
    return { width: coverWidth, height: coverWidth / CURATED_COVER_ASPECT };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good evening</Text>
            <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable onPress={handleNotificationPress} style={styles.bellWrap}>
              <Icon name="notifications-outline" size={24} color={DS.colors.onSurfaceVariant} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Profile')}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      >
        {/* ── Continue reading hero ──────────────────────────────── */}
        {activeBook && (
          <View style={styles.heroSection}>
            <View style={styles.heroCard}>
              <BookCoverGradient
                coverUrl={activeBook.coverUrl}
                title={activeBook.title}
                width={112}
                height={156}
                borderRadius={16}
                style={styles.heroCover}
              />
              <Text style={styles.heroEyebrow}>Continue reading</Text>
              <Text style={styles.heroTitle} numberOfLines={2}>{activeBook.title}</Text>
              <Text style={styles.heroMeta}>
                Chapter {activeBook.chapter} of {activeBook.totalChapters} · {activeBook.progressPct}%
              </Text>
              <View style={styles.heroTrack}>
                <LinearGradient
                  colors={[DS.colors.primary, DS.colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.heroFill, { width: `${activeBook.progressPct}%` }]}
                />
              </View>
              {friends.length > 0 && (
                <View style={styles.friendsRow}>
                  <View style={styles.avatarStack}>
                    {friends.slice(0, 2).map((f, i) => (
                      <View
                        key={f.userId}
                        style={[styles.friendAvatar, i > 0 && styles.friendAvatarOverlap]}
                      >
                        <Text style={styles.friendAvatarText}>{f.initials}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.friendsCaption}>
                    {friendNames} {friends.length > 1 ? 'are' : 'is'} ahead — <Text style={styles.friendsHighlight}>{commentsWaiting} comments waiting</Text>
                  </Text>
                </View>
              )}
            </View>
            <GradientPill onPress={handleContinueReading} style={styles.cta}>
              <Text style={styles.ctaText}>Pick up where you left off</Text>
            </GradientPill>
          </View>
        )}

        {/* ── Your rooms tonight ─────────────────────────────────── */}
        {rooms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your rooms tonight</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {rooms.map((room) => (
                <TouchableOpacity
                  key={room.id}
                  style={styles.chip}
                  activeOpacity={0.85}
                  onPress={() => openRoom(room)}
                >
                  <View style={styles.chipIcon}>
                    <Icon name="chatbubbles" size={15} color={DS.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.chipName}>{room.name}</Text>
                    <Text style={room.unreadCount > 0 ? styles.chipStatusUnread : styles.chipStatus}>
                      {room.unreadCount > 0 ? `${room.unreadCount} new comments` : (room.status || 'quiet today')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Curated for you ────────────────────────────────────── */}
        {curatedBuckets.length > 0 && (
          <View style={[styles.section, styles.lastSection]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Curated for you</Text>
              <TouchableOpacity onPress={() => navigation.navigate('LibraryScreen')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.curatedRow}>
              {curatedBuckets.slice(0, 2).map((bucket, i) => {
                const cover = curatedCoverSize(i === 0);
                return (
                  <TouchableOpacity
                    key={bucket.id}
                    style={[styles.curatedCard, i === 0 ? styles.curatedCardWide : styles.curatedCardNarrow]}
                    activeOpacity={0.85}
                    onPress={() => openBucket(bucket)}
                  >
                    <BookCoverGradient
                      coverUrl={bucket.coverImageUrl}
                      title={bucket.name}
                      width={cover.width}
                      height={cover.height}
                      borderRadius={16}
                      titleFontSize={i === 0 ? 15 : 13}
                      style={styles.curatedCover}
                    />
                    <Text style={styles.curatedLabel} numberOfLines={1}>{bucket.name}</Text>
                    <Text style={styles.curatedCount}>
                      {bucket.bookCount || 0} {bucket.bookCount === 1 ? 'book' : 'books'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={notifModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {notifLoading ? (
              <ActivityIndicator size="large" color={DS.colors.primary} />
            ) : (
              <NotificationList
                notifications={notifications}
                onNotificationRead={markAsRead}
                onClose={() => setNotifModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
  },
  greeting: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
  },
  username: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  bellWrap: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    fontSize: 10,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Hero
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  heroCard: {
    position: 'relative',
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.hero,
    padding: 20,
    paddingLeft: 128,
    minHeight: 172,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  heroCover: {
    position: 'absolute',
    left: -8,
    top: -14,
    transform: [{ rotate: '-2deg' }],
    shadowColor: DS.colors.surfaceContainerLowest,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 10,
  },
  heroEyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 4,
  },
  heroMeta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  heroTrack: {
    height: 4,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarOverlap: {
    marginLeft: -7,
  },
  friendAvatarText: {
    fontSize: 9,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  friendsCaption: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  friendsHighlight: {
    color: DS.colors.primary,
  },
  cta: {
    marginTop: 14,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },

  // Sections
  section: {
    paddingTop: 26,
    paddingHorizontal: 24,
  },
  lastSection: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  seeAll: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Rooms tonight chips
  chipRow: {
    gap: 10,
    paddingRight: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.full,
    paddingVertical: 8,
    paddingRight: 16,
    paddingLeft: 8,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipName: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  chipStatus: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  chipStatusUnread: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.primaryContainer,
  },

  // Curated for you
  curatedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  curatedCard: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 12,
  },
  curatedCardWide: {
    width: '58%',
  },
  curatedCardNarrow: {
    width: '42%',
    alignSelf: 'flex-end',
  },
  curatedCover: {
    marginBottom: 10,
  },
  curatedLabel: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  curatedCount: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
  },

  // Notifications modal (same treatment as CommonHeader's)
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(6, 13, 32, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderTopLeftRadius: DS.radius.xl,
    borderTopRightRadius: DS.radius.xl,
    height: '80%',
    width: '100%',
    paddingTop: 20,
  },
});

export default Home;
