import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import lobbyStyles from './lobbyStyles';
import { formatJoinDate } from './roomLobbyFormat';

const MemberList = ({ members }) => (
  <>
    <Text style={lobbyStyles.eyebrow}>Members · {members.length}</Text>
    <View style={styles.memberList}>
      {members.map((member) => (
        <View key={member.id} style={styles.memberRow}>
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
              {member.isCreator
                ? 'Room creator'
                : member.joinedAt
                  ? `Joined ${formatJoinDate(member.joinedAt)}`
                  : 'Member'}
            </Text>
          </View>
        </View>
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
