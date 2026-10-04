import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import { roomAgeLabel } from './roomLobbyFormat';
import PressableScale from '../../components/PressableScale';

const LobbyHeader = ({ room, bookTitle, bucket, memberCount, onBack }) => (
  <View style={styles.header}>
    <PressableScale
      onPress={onBack}
      style={styles.backButton}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
    </PressableScale>
    <View style={styles.headerText}>
      <Text style={styles.roomName} numberOfLines={1}>{room?.name ?? 'Room'}</Text>
      <Text style={styles.roomSubtitle} numberOfLines={1}>
        {bookTitle || roomAgeLabel(room?.createdAt)} · {memberCount}{' '}
        {memberCount === 1 ? 'member' : 'members'}
        {bucket?.name ? ` · from ${bucket.name}` : ''}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  roomName: {
    fontSize: 24,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
  },
  roomSubtitle: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
});

export default LobbyHeader;
