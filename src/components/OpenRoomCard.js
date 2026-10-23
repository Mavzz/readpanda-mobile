import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from './BookCoverGradient';

export const memberCountLabel = (count) => `${count} ${count === 1 ? 'member' : 'members'}`;

// An open room on the Rooms tab and See all. Built like the reader's own room
// card, with the member count where that card has avatars and the group
// track: someone outside the room doesn't get to see who's in it.
const OpenRoomCard = ({ room, onPress, style }) => {
  const book = room.currentBookTitle || 'No book yet';
  const members = memberCountLabel(room.memberCount);
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.85}
      onPress={() => onPress(room)}
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${room.currentBookTitle ? `reading ${book}` : book}, ${members}`}
    >
      <BookCoverGradient
        coverUrl={room.coverUrl}
        title={room.currentBookTitle}
        width={56}
        height={78}
        borderRadius={12}
        titleFontSize={8}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{room.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>{book}</Text>
        <View style={styles.memberRow}>
          <Icon name="people-outline" size={14} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.memberText} numberOfLines={1}>{members}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 16,
    marginBottom: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default OpenRoomCard;
