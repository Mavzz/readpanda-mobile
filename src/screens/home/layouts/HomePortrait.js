import { View, StyleSheet } from 'react-native';

// 16d: Continue full width; Your week and Rooms tonight side by side (either
// takes the row alone if the other has nothing); New in your rooms as two
// cards; Up next and Popular five across.
const HomePortrait = ({ hero, yourWeek, roomsTonight, newInRooms, upNext, popular }) => (
  <View style={styles.column}>
    {hero}
    {yourWeek || roomsTonight ? (
      <View style={styles.pair}>
        {yourWeek ? <View style={styles.half}>{yourWeek}</View> : null}
        {roomsTonight ? <View style={styles.half}>{roomsTonight}</View> : null}
      </View>
    ) : null}
    {newInRooms}
    {upNext}
    {popular}
  </View>
);

const styles = StyleSheet.create({
  column: {
    gap: 24,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
});

export default HomePortrait;
