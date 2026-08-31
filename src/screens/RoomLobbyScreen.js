import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { showToast } from '../components/Toaster';
import ProfilePicture from '../components/ProfilePicture';
import log from '../utils/logger';

const RoomLobbyScreen = ({ navigation, route }) => {
  const room = route?.params?.room ?? null;
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!room?.invite_code) return;
    Clipboard.setString(room.invite_code);
    setCopied(true);
    showToast('Invite code copied!', 'success', 2000);
    setTimeout(() => setCopied(false), 2000);
    log.info('Invite code copied:', room.invite_code);
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberItem}>
      <ProfilePicture size={48} user={{ username: item.username }} />
      <Text style={styles.memberName} numberOfLines={1}>{item.username}</Text>
      {item.role === 'admin' && (
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={22} color={DS.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {room?.name ?? 'Room'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Invite Code */}
        <View style={styles.inviteSection}>
          <Text style={styles.sectionLabel}>Invite Code</Text>
          <TouchableOpacity style={styles.inviteCodeCard} onPress={handleCopyCode} activeOpacity={0.7}>
            <Text style={styles.inviteCode}>{room?.invite_code ?? '------'}</Text>
            <View style={styles.copyChip}>
              <Icon
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={copied ? DS.colors.onPrimary : DS.colors.primary}
              />
              <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.inviteHint}>Share this code so others can join the room</Text>
        </View>

        {/* Description */}
        {room?.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{room.description}</Text>
            </View>
          </View>
        ) : null}

        {/* Current Book */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Currently Reading</Text>
          {room?.current_book ? (
            <View style={styles.bookCard}>
              <Icon name="book-outline" size={32} color={DS.colors.primary} />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{room.current_book.title}</Text>
                <Text style={styles.bookMeta}>{room.current_book.genre ?? ''}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="book-outline" size={28} color={DS.colors.onSurfaceVariant} />
              <Text style={styles.emptyCardText}>No book selected yet</Text>
            </View>
          )}
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {room?.members?.length ? `Members · ${room.members.length}` : 'Members'}
          </Text>
          {room?.members?.length > 0 ? (
            <FlatList
              data={room.members}
              keyExtractor={(item) => item.user_id ?? item.username}
              renderItem={renderMember}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.memberSeparator} />}
            />
          ) : (
            <View style={styles.emptyCard}>
              <Icon name="people-outline" size={28} color={DS.colors.onSurfaceVariant} />
              <Text style={styles.emptyCardText}>No members yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing[24],
    paddingVertical: DS.spacing[20],
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: DS.spacing[12],
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: DS.colors.onSurface,
  },
  headerRight: {
    width: 36,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: DS.spacing[24],
    paddingBottom: DS.spacing[48],
  },

  // Section
  section: {
    marginBottom: DS.spacing[32],
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginBottom: DS.spacing[12],
  },

  // Invite code
  inviteSection: {
    marginBottom: DS.spacing[32],
  },
  inviteCodeCard: {
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.md,
    borderWidth: 1,
    borderColor: DS.colors.primary,
    paddingVertical: DS.spacing[20],
    paddingHorizontal: DS.spacing[24],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: '800',
    color: DS.colors.primary,
    letterSpacing: 8,
  },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainerHigh,
    paddingHorizontal: DS.spacing[12],
    paddingVertical: DS.spacing[8],
    borderRadius: DS.radius.full,
    gap: 4,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '700',
    color: DS.colors.primary,
  },
  copyTextDone: {
    color: DS.colors.onPrimary,
  },
  inviteHint: {
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    marginTop: DS.spacing[12],
  },

  // Description
  descriptionCard: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: DS.spacing[20],
    borderWidth: 1,
    borderColor: DS.colors.surfaceContainerHighest,
  },
  descriptionText: {
    fontSize: 15,
    color: DS.colors.onSurface,
    lineHeight: 24,
  },

  // Book
  bookCard: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    borderWidth: 1,
    borderColor: DS.colors.surfaceContainerHighest,
    padding: DS.spacing[20],
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing[16],
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS.colors.onSurface,
    marginBottom: 4,
  },
  bookMeta: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
  },

  // Empty card
  emptyCard: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    borderWidth: 1,
    borderColor: DS.colors.surfaceContainerHighest,
    paddingVertical: DS.spacing[24],
    paddingHorizontal: DS.spacing[20],
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing[16],
  },
  emptyCardText: {
    fontSize: 15,
    color: DS.colors.onSurfaceVariant,
  },

  // Members
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.spacing[12],
    gap: DS.spacing[16],
  },
  memberName: {
    flex: 1,
    fontSize: 16,
    color: DS.colors.onSurface,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: DS.colors.primaryContainer,
    paddingHorizontal: DS.spacing[12],
    paddingVertical: 4,
    borderRadius: DS.radius.full,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: DS.colors.onPrimary,
  },
  memberSeparator: {
    height: 1,
    backgroundColor: DS.colors.surfaceContainerHighest,
    marginLeft: 64,
  },
});

export default RoomLobbyScreen;
