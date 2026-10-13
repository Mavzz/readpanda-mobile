import { View, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import { Bone } from '../../components/Skeleton';

// Home before the shelf and rooms have loaded: the Continue card's shape and
// the Your week card under it (16a). `bare` when the screen already pads it.
const HomeSkeleton = ({ bare = false }) => (
  <View style={[styles.column, !bare && styles.padded]}>
    <Bone width="100%" height={230} radius={DS.radius.hero} />
    <Bone width="100%" height={120} radius={22} />
  </View>
);

const styles = StyleSheet.create({
  column: {
    gap: 24,
  },
  padded: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
});

export default HomeSkeleton;
