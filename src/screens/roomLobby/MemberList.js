import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import lobbyStyles from './lobbyStyles';
import { formatJoinDate } from './roomLobbyFormat';
import useSafetyActions from '../../hooks/useSafetyActions';

const DELETED_READER_ID = '00000000-0000-0000-0000-000000000000';

const roleLine = (member) => {
  if (member.isCreator) {
    return 'Room creator';
  }
  return member.joinedAt ? `Joined ${formatJoinDate(member.joinedAt)}` : 'Member';
};

// Anyone else in the room can be tapped to report or block (report-block
// R2.1); not you, and not the Deleted reader (R2.4). Someone you've blocked
// stays listed, marked (R5.6).
const MemberRow = ({ member, onPress }) => {
  const tappable = !member.isSelf && !!member.userId && member.userId !== DELETED_READER_ID;
  const role = roleLine(member);
  const content = (
    <>
      <View style={[styles.memberAvatar, member.isSelf && styles.memberAvatarSelf]}>
        <Text style={[styles.memberInitials, member.isSelf && styles.memberInitialsSelf]}>
          {member.initials}
        </Text>
      </View>
      <View style={styles.memberText}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.name}
          {member.isSelf ? <Text style={styles.memberYou}> (you)</Text> : null}
        </Text>
        <Text style={styles.memberRole}>
          {member.blocked ? <Text style={styles.memberBlocked}>Blocked · </Text> : null}
          {role}
        </Text>
      </View>
      {tappable ? <Icon name="ellipsis-horizontal" size={16} color={DS.colors.onSurfaceVariant} /> : null}
    </>
  );
  if (!tappable) {
    return <View style={styles.memberRow}>{content}</View>;
  }
  return (
    <Pressable
      onPress={() => onPress(member)}
      style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${member.name}, ${member.blocked ? 'blocked, ' : ''}${role}`}
      accessibilityHint="Report or block"
    >
      {content}
    </Pressable>
  );
};

const MemberList = ({ members, roomId }) => {
  const { memberMenu } = useSafetyActions();
  const open = (member) => memberMenu(
    { userId: member.userId, username: member.name, blocked: member.blocked },
    { roomId },
  );

  return (
    <>
      <Text style={lobbyStyles.eyebrow}>Members · {members.length}</Text>
      <View style={styles.memberList}>
        {members.map((member) => (
          <MemberRow key={member.id} member={member} onPress={open} />
        ))}

        {members.length < 2 && (
          <View style={styles.waitingRow}>
            <View style={styles.waitingIcon}>
              <Icon name="person-add-outline" size={15} color={DS.colors.onSurfaceVariant} />
            </View>
            <Text style={styles.waitingText}>
            Waiting for friends — share the code above and they&apos;ll appear here.
            </Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  memberList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.comment,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  memberRowPressed: {
    opacity: 0.85,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarSelf: {
    backgroundColor: DS.colors.primary,
  },
  memberInitials: {
    fontSize: 12,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  memberInitialsSelf: {
    color: DS.colors.onPrimary,
  },
  memberText: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  memberYou: {
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  memberBlocked: {
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  memberRole: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.comment,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  waitingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
});

export default MemberList;
