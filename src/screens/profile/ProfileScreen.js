import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import BookCoverGradient from '../../components/BookCoverGradient';
import { showToast } from '../../components/Toaster';
import useAuthStore from '../../stores/authStore';
import { useScreenTracking } from '../../utils/screenTracking';
import getInitials from '../../utils/getInitials';
import relativeTime from '../../utils/relativeTime';
import pickProfilePhoto from '../../utils/pickProfilePhoto';
import { DS } from '../../styles/global';
import profileStyles from './profileStyles';
import useProfileData from './useProfileData';
import MakeItYoursCard from './MakeItYoursCard';

const MAX_COVERS = 4;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "Ada Lovelace" → "Ada L." — what the name falls back to when it won't fit
// on one line, before it is ellipsized.
const shortName = (name) => {
  const parts = name.trim().split(/\s+/);
  return parts.length < 2 ? name : `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const readingSince = (date) => (
  date ? `Reading since ${MONTHS[date.getMonth()]} ${date.getFullYear()}` : null
);

// "Joined today", else "Joined yesterday" / "Joined 3d ago" / "Joined 4 Sep".
const joined = (date) => {
  if (!date) {
    return null;
  }
  const today = date.toDateString() === new Date().toDateString();
  return `Joined ${today ? 'today' : relativeTime(date.getTime())}`;
};

// With a photo (7a): 96pt inside a 3pt surface gap and a 2pt half-alpha
// primary ring. Without one (7c): a dashed ring around the initials and a
// camera badge that opens the picker — the "Add a profile photo" step.
const Avatar = ({ user, name, onAddPhoto }) => {
  const [failedUri, setFailedUri] = useState(null);
  const uri = user?.profilePicture && user.profilePicture !== failedUri ? user.profilePicture : null;

  if (uri) {
    return (
      <View style={styles.avatarRing}>
        <Image source={{ uri }} style={styles.avatar} onError={() => setFailedUri(uri)} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={onAddPhoto}
      style={({ pressed }) => pressed && profileStyles.pressed}
      accessibilityLabel="Add a profile photo"
      accessibilityRole="button"
    >
      <View style={[styles.avatar, styles.avatarEmpty]}>
        <Text style={styles.initials}>{getInitials(name)}</Text>
      </View>
      <LinearGradient
        colors={[DS.colors.primary, DS.colors.primaryContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cameraBadge}
      >
        <Icon name="camera" size={14} color={DS.colors.onPrimary} />
      </LinearGradient>
    </Pressable>
  );
};

// Before the first finished book: three dashed outlines, fading, so the
// space reads as waiting to be filled rather than empty.
const EmptyShelf = () => (
  <View style={styles.emptyShelf}>
    <View style={styles.covers}>
      {[1, 0.6, 0.3].map((opacity) => (
        <View key={opacity} style={[styles.ghostCover, { opacity }]} />
      ))}
    </View>
    <Text style={styles.emptyShelfText}>Books you finish land here.</Text>
  </View>
);

// One line, always. A name that overflows is measured off-screen first, then
// shown as "{first} {lastInitial}." and ellipsized from there.
const ProfileName = ({ name }) => {
  const [overflows, setOverflows] = useState(false);
  return (
    <View style={styles.nameBox}>
      <Text
        style={[styles.name, styles.measure]}
        onTextLayout={(e) => setOverflows(e.nativeEvent.lines.length > 1)}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {name}
      </Text>
      <Text style={styles.name} numberOfLines={1} accessibilityLabel={name}>
        {overflows ? shortName(name) : name}
      </Text>
    </View>
  );
};

const Stat = ({ value, label, icon }) => (
  <View style={styles.stat}>
    <View style={styles.statValueRow}>
      {icon ? <Icon name={icon} size={18} color={DS.colors.primaryContainer} /> : null}
      <Text style={styles.statValue}>{value}</Text>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ProfileScreen = () => {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const {
    hasProgress, finishedCount, readingCount, streak, finishedThisYear, rooms, year,
  } = useProfileData();

  useScreenTracking('ProfileScreen');

  const handle = user?.username || '';
  const name = user?.name || handle || 'Reader';
  const createdAt = validDate(user?.createdAt ?? user?.created_at);
  // Each section leaves its new-reader (7c) form on its own; the meta line
  // turns over with the first book opened.
  const since = hasProgress ? readingSince(createdAt) : joined(createdAt);
  const covers = finishedThisYear.slice(0, MAX_COVERS);
  const overflow = finishedThisYear.length - covers.length;

  const addPhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) {
      updateUser({ profilePicture: uri });
    }
  };

  const steps = [
    { key: 'account', title: 'Create account', subtitle: 'You\'re in', done: true },
    {
      key: 'book',
      title: 'Start your first book',
      subtitle: 'Pick something from the library',
      done: hasProgress,
      onPress: () => navigation.navigate('Tabs', { screen: 'Home', params: { screen: 'LibraryScreen' } }),
    },
    {
      key: 'room',
      title: 'Join or start a room',
      subtitle: 'Read along with friends',
      done: rooms.length > 0,
      onPress: () => navigation.navigate('Tabs', { screen: 'Rooms', params: { focusCode: true } }),
    },
    {
      key: 'photo',
      title: 'Add a profile photo',
      subtitle: 'So your rooms know it\'s you',
      done: !!user?.profilePicture,
      onPress: addPhoto,
    },
  ];
  const showChecklist = !hasProgress && steps.some((step) => !step.done);

  return (
    <SafeAreaView style={profileStyles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView contentContainerStyle={profileStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [profileStyles.circleButton, pressed && profileStyles.pressed]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={({ pressed }) => [profileStyles.circleButton, pressed && profileStyles.pressed]}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Icon name="settings-outline" size={18} color={DS.colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <Avatar user={user} name={name} onAddPhoto={addPhoto} />
          <ProfileName name={name} />
          <Text style={styles.handle} numberOfLines={1}>
            @{handle}{since ? ` · ${since}` : ''}
          </Text>
          <Pressable
            // The edit form is its own piece of work (out of scope for 7a).
            onPress={() => showToast('Editing your profile is coming soon', 'info')}
            style={({ pressed }) => [styles.editPill, pressed && profileStyles.pressed]}
            accessibilityRole="button"
          >
            <Icon name="pencil" size={12} color={DS.colors.primary} />
            <Text style={styles.editPillText}>Edit profile</Text>
          </Pressable>
        </View>

        {showChecklist ? <MakeItYoursCard steps={steps} /> : null}

        {hasProgress ? (
          <View style={styles.stats}>
            <Stat value={finishedCount} label="Finished" />
            <View style={styles.statDivider} />
            <Stat value={readingCount} label="Reading" />
            <View style={styles.statDivider} />
            {/* Under a day there is no streak to speak of — a dash, not a zero. */}
            <Stat value={streak >= 1 ? streak : '—'} label="Day streak" icon="flame" />
          </View>
        ) : null}

        {finishedCount === 0 ? (
          <View style={styles.section}>
            <Text style={[profileStyles.eyebrow, styles.sectionTitle]}>Your shelf</Text>
            <EmptyShelf />
          </View>
        ) : null}

        {finishedThisYear.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={profileStyles.eyebrow}>Finished in {year}</Text>
              <Pressable
                onPress={() => navigation.navigate('Tabs', { screen: 'Reading' })}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.covers}>
              {covers.map((book) => (
                <BookCoverGradient
                  key={book.id}
                  coverUrl={book.coverUrl}
                  title={book.title}
                  width={62}
                  height={88}
                  borderRadius={10}
                  titleFontSize={8}
                />
              ))}
              {overflow > 0 ? (
                <View style={styles.overflowTile}>
                  <Text style={styles.overflowText}>+{overflow}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {rooms.length > 0 ? (
          <View style={styles.section}>
            <Text style={[profileStyles.eyebrow, styles.sectionTitle]}>Your rooms</Text>
            <View style={profileStyles.groupCard}>
              {rooms.map((room, i) => {
                const memberCount = room.members?.length || 0;
                const book = room.currentBook?.title || room.currentBookTitle;
                return (
                  <View key={room.id}>
                    {i > 0 ? <View style={styles.roomDivider} /> : null}
                    <Pressable
                      onPress={() => navigation.navigate('RoomLobbyScreen', { room })}
                      style={({ pressed }) => [styles.roomRow, pressed && styles.roomRowPressed]}
                      accessibilityRole="button"
                    >
                      <View style={styles.roomTile}>
                        <Icon name="people" size={17} color={DS.colors.primary} />
                      </View>
                      <View style={styles.roomText}>
                        <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                        <Text style={styles.roomMeta} numberOfLines={1}>
                          {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          {book ? ` · ${book}` : ''}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={15} color={DS.colors.onSurfaceVariant} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  identity: {
    alignItems: 'center',
    marginTop: 4,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: DS.colors.primary + '80', // 50%
    backgroundColor: DS.colors.surface,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarEmpty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainer,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DS.colors.primary + '80', // 50%
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: DS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 32,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  nameBox: {
    alignSelf: 'stretch',
    marginTop: 14,
  },
  name: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  // Same width and type as the visible name, laid out but never seen.
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
  handle: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    marginTop: 14,
  },
  editPillText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 24,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: DS.colors.outlineVariant,
  },

  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  covers: {
    flexDirection: 'row',
    gap: 6,
  },
  emptyShelf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ghostCover: {
    width: 62,
    height: 88,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: DS.colors.outlineVariant,
  },
  emptyShelfText: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  overflowTile: {
    width: 62,
    height: 88,
    borderRadius: 10,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurfaceVariant,
  },

  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  roomRowPressed: {
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  roomTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomText: {
    flex: 1,
    minWidth: 0,
  },
  roomName: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  roomMeta: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  // Inset past the room tile: 16 padding + 36 tile + 12 gap.
  roomDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
    backgroundColor: DS.colors.outlineVariant,
  },
});

export default ProfileScreen;
