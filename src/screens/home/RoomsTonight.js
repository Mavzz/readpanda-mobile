import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import homeStyles from './homeStyles';

// "Your rooms tonight" chips. Until there is a room to show — and for a reader
// who has a book but no rooms yet — the join-by-code row takes its place.
const RoomsTonight = ({ rooms, ready, onOpenRoom, onJoinByCode }) => {
  if (rooms.length > 0) {
    return (
      <View style={homeStyles.section}>
        <Text style={homeStyles.sectionTitle}>Your rooms tonight</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.chip}
              activeOpacity={0.85}
              onPress={() => onOpenRoom(room)}
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
    );
  }

  if (!ready) {
    return null;
  }

  return (
    <View style={styles.joinRowWrap}>
      <Pressable
        onPress={onJoinByCode}
        style={({ pressed }) => [styles.joinRow, pressed && homeStyles.pressed]}
      >
        <View style={styles.joinIcon}>
          <Icon name="key-outline" size={15} color={DS.colors.primary} />
        </View>
        <Text style={styles.joinText}>Got an invite code from a friend?</Text>
        <Text style={styles.joinAction}>Join a room</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
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

  // Join by code
  joinRowWrap: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.comment,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  joinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinText: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  joinAction: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default RoomsTonight;
