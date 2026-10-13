import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import PressableScale from '../../components/PressableScale';
import SectionHeader from './SectionHeader';
import RoomTonightCard from './RoomTonightCard';

// Rooms tonight (16e): every room you're in, nearest deadline first, then
// rooms with no book, then the rest. Phone: a sideways row of cards that runs
// to the screen edge (`gutter` is the page padding it bleeds past). iPad: the
// same states stacked in one card (`stacked`). With no rooms, the join-by-code
// row (3a) takes the section's place.
const RoomsTonight = ({ items, ready, stacked = false, gutter = 24, onOpenRoom, onStartRoom, onAllRooms, onJoinByCode }) => {
  if (items.length === 0) {
    if (!ready) {
      return null;
    }
    return (
      <PressableScale onPress={onJoinByCode} style={styles.joinRow} accessibilityRole="button">
        <View style={styles.joinIcon}>
          <Icon name="key-outline" size={15} color={DS.colors.primary} />
        </View>
        <Text style={styles.joinText}>Got an invite code from a friend?</Text>
        <Text style={styles.joinAction}>Join a room</Text>
      </PressableScale>
    );
  }

  return (
    <View>
      <SectionHeader title="Rooms tonight" link="All rooms" onLink={onAllRooms} />
      {stacked ? (
        <View style={styles.stack}>
          {items.map((item, i) => (
            <View key={item.room.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <RoomTonightCard item={item} inList onOpen={onOpenRoom} onStart={onStartRoom} />
            </View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
          contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
        >
          {items.map((item) => (
            <RoomTonightCard key={item.room.id} item={item} onOpen={onOpenRoom} onStart={onStartRoom} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: 12,
  },
  stack: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 22,
    backgroundColor: DS.colors.surfaceContainer,
  },
  divider: {
    height: 1,
    backgroundColor: DS.colors.hairline,
  },

  // Join by code (3a, unchanged)
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
