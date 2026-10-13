import { View, StyleSheet } from 'react-native';
import SplitLayout from '../../../components/SplitLayout';

// 16c: books on the left (Continue → Up next → Popular), people on the right
// (Your week → Rooms tonight → New in your rooms), 7fr / 5fr, scrolling
// together in the screen's one ScrollView.
const HomeLandscape = ({ hero, yourWeek, roomsTonight, newInRooms, upNext, popular }) => (
  <SplitLayout
    ratio={[7, 5]}
    gap={20}
    left={<View style={styles.column}>{hero}{upNext}{popular}</View>}
    right={<View style={styles.column}>{yourWeek}{roomsTonight}{newInRooms}</View>}
  />
);

const styles = StyleSheet.create({
  column: {
    gap: 24,
  },
});

export default HomeLandscape;
