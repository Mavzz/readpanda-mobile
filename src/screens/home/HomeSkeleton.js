import { View, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import { Bone, EyebrowBone } from '../../components/Skeleton';
import homeStyles from './homeStyles';

// Home before the shelf and rooms have loaded: the hero card (HeroCard's
// 172pt), then the rooms eyebrow and two room chips.
const HomeSkeleton = () => (
  <View>
    <View style={styles.heroSection}>
      <Bone width="100%" height={172} radius={DS.radius.hero} />
    </View>
    <View style={homeStyles.section}>
      <EyebrowBone width={140} style={styles.eyebrow} />
      <View style={styles.chipRow}>
        <Bone width={150} height={48} radius={DS.radius.full} />
        <Bone width={130} height={48} radius={DS.radius.full} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  eyebrow: {
    marginTop: 3,
    marginBottom: DS.space.headerToContent,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

export default HomeSkeleton;
