import { View, StyleSheet } from 'react-native';

// 16a / 16b: one column, every section in order, 24pt between them. Each
// slot is an element or null; a null section simply isn't there.
const HomePhone = ({ hero, yourWeek, roomsTonight, newInRooms, upNext, popular }) => (
  <View style={styles.column}>
    {hero}
    {yourWeek}
    {roomsTonight}
    {newInRooms}
    {upNext}
    {popular}
  </View>
);

const styles = StyleSheet.create({
  column: {
    gap: 24,
  },
});

export default HomePhone;
