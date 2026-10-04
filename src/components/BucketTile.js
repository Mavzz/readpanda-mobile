import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { CURATED_GROUND, SCRIM_COLORS } from '../utils/covers';
import { booksLabel } from '../utils/readingTime';
import CoverFan from './CoverFan';
import PressableScale from './PressableScale';
import ProgressFill from './ProgressFill';
import RollingCount from './RollingCount';

// § 9c — the one bucket tile, in two variants.
//
//   curated  Discover's 2-up grid. Warm ground, fanned covers, a bottom
//            scrim carrying "CURATED" and the name; `meta` underneath.
//   mine     My Books' row. 132×120 on surfaceContainer, the name below, and
//            a finished/total bar (or just the count while nothing's done).
//            A `width` widens it for 10e's 2-column grid. A copy saved from a
//            curated bucket (`saved`) keeps the warm ground plus a sparkle.
//
// `covers` are the bucket's first books in bucket order (under a genre
// filter the server puts the matching ones first).
export const MINE_WIDTH = 132;
const MINE_HEIGHT = 120;
const CURATED_HEIGHT = 150;

const BucketTile = ({
  variant,
  covers = [],
  name,
  meta,
  width,
  bookCount = 0,
  finishedCount = 0,
  saved = false,
  onPress,
  onLongPress,
  // Names the tile's progress bar so it grows from what was last shown.
  progressKey,
}) => {
  if (variant === 'curated') {
    return (
      <PressableScale
        onPress={onPress}
        style={[{ width }]}
        accessibilityLabel={`${name}, curated, ${meta}`}
        accessibilityRole="button"
      >
        {/* Gradients stay childless: react-native-linear-gradient runs through
            Fabric's legacy interop, which mismanages nested children (and
            ignores `bottom`), so each is a background layer sized by top/left. */}
        <View style={[styles.curatedTile, { width }]}>
          <LinearGradient
            colors={CURATED_GROUND}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ground, { width }]}
          />
          <CoverFan
            covers={covers}
            seed={name}
            width={width}
            height={CURATED_HEIGHT - 34}
            coverWidth={58}
            coverHeight={84}
            offset={24}
          />
          <LinearGradient
            colors={SCRIM_COLORS}
            style={[styles.scrim, { width }]}
            pointerEvents="none"
          />
          <View style={styles.curatedLabel}>
            <Text style={styles.eyebrow}>Curated</Text>
            <Text style={styles.curatedName} numberOfLines={1}>{name}</Text>
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
      </PressableScale>
    );
  }

  const pct = bookCount > 0 ? Math.round((finishedCount / bookCount) * 100) : 0;
  const tileWidth = width || MINE_WIDTH;
  const tileHeight = width ? Math.round(width * 0.78) : MINE_HEIGHT;
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      style={[{ width: tileWidth }]}
      accessibilityLabel={`${name}, ${saved ? 'saved from Discover, ' : ''}${finishedCount > 0 ? `${finishedCount} of ${bookCount} finished` : booksLabel(bookCount)}`}
      accessibilityRole="button"
    >
      <View style={[styles.mineTile, { width: tileWidth, height: tileHeight }]}>
        {saved ? (
          <LinearGradient
            colors={CURATED_GROUND}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ground, { width: tileWidth, height: tileHeight }]}
          />
        ) : null}
        <CoverFan
          covers={covers}
          seed={name}
          width={tileWidth}
          height={tileHeight}
          coverWidth={52}
          coverHeight={76}
          offset={24}
        />
      </View>
      <View style={styles.mineNameLine}>
        <Text style={styles.mineName} numberOfLines={1}>{name}</Text>
        {saved ? <Icon name="sparkles" size={12} color={DS.colors.primary} /> : null}
      </View>
      {finishedCount > 0 ? (
        <View style={styles.progressLine}>
          <View style={styles.track}>
            <ProgressFill pct={pct} seenKey={progressKey} style={styles.fill} />
          </View>
          <View style={styles.fractionRow}>
            <RollingCount value={finishedCount} style={styles.fraction} />
            <Text style={styles.fraction}>/{bookCount}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.meta}>{booksLabel(bookCount)}</Text>
      )}
    </PressableScale>
  );
};

// The dashed tile at the end of My Books' row (and the only tile at 0
// buckets).
export const NewBucketTile = ({ onPress }) => (
  <PressableScale
    onPress={onPress}
    style={styles.mine}
    accessibilityLabel="New bucket"
    accessibilityRole="button"
  >
    <View style={[styles.mineTile, styles.newTile]}>
      <Icon name="add" size={22} color={DS.colors.primary} />
      <Text style={styles.newText}>New bucket</Text>
    </View>
  </PressableScale>
);

const styles = StyleSheet.create({
  fractionRow: {
    flexDirection: 'row',
  },

  // curated
  curatedTile: {
    height: CURATED_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
  },
  ground: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: CURATED_HEIGHT,
  },
  scrim: {
    position: 'absolute',
    top: CURATED_HEIGHT * 0.45,
    left: 0,
    height: CURATED_HEIGHT * 0.55,
  },
  curatedLabel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 11,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  curatedName: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  meta: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 6,
  },

  // mine
  mine: {
    width: MINE_WIDTH,
  },
  mineTile: {
    width: MINE_WIDTH,
    height: MINE_HEIGHT,
    borderRadius: 20,
    backgroundColor: DS.colors.surfaceContainer,
    overflow: 'hidden',
  },
  mineNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  mineName: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  track: {
    flex: 1,
    height: 3,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
  },
  fraction: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  newTile: {
    backgroundColor: DS.colors.background,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: DS.colors.createDash,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  newText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default BucketTile;
