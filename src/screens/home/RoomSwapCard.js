import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import homeStyles from './homeStyles';

// "Your room is reading something else" — an offer, deliberately quieter than
// the hero it sits under. The hero stays the reader's own; this is an explicit
// swap, never taken automatically.
const RoomSwapCard = ({ room, onSwitch }) => (
  <Pressable
    onPress={() => onSwitch(room)}
    style={({ pressed }) => [styles.swapCard, pressed && homeStyles.pressed]}
  >
    <BookCoverGradient
      coverUrl={room.coverUrl}
      title={room.currentBookTitle}
      width={40}
      height={56}
      borderRadius={8}
      titleFontSize={7}
    />
    <View style={styles.swapText}>
      <Text style={styles.swapTitle} numberOfLines={1}>
        {room.name} is reading {room.currentBookTitle}
      </Text>
      <Text style={styles.swapBody}>Read this instead — your place here is kept</Text>
    </View>
    <Icon name="chevron-forward" size={18} color={DS.colors.primary} />
  </Pressable>
);

const styles = StyleSheet.create({
  swapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 12,
    borderRadius: DS.radius.comment,
    backgroundColor: DS.colors.surfaceContainer,
  },
  swapText: {
    flex: 1,
  },
  swapTitle: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    marginBottom: 3,
  },
  swapBody: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default RoomSwapCard;
