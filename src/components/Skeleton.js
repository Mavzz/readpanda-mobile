import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { DS } from '../styles/global';
import { MOTION } from '../styles/motion';

// 12e skeletons: shapes match the content they stand in for, a 1.2s shimmer
// sweeps across them, and nothing shows for loads under 300ms. Reduce Motion
// keeps the shapes and drops the sweep.

// True once `active` has held for MOTION.skeleton.minVisible — gate a
// skeleton on this so quick loads go straight to content without a flash.
export const useSkeletonDelay = (active) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!active) {
      setShow(false);
      return undefined;
    }
    const timer = setTimeout(() => setShow(true), MOTION.skeleton.minVisible);
    return () => clearTimeout(timer);
  }, [active]);
  return show;
};

const SHINE = [
  DS.colors.surfaceContainer + '00',
  DS.colors.surfaceContainer,
  DS.colors.surfaceContainer + '00',
];

// One placeholder shape. `width` may be a number or a percentage.
export const Bone = ({ width, height, radius = 8, style }) => {
  const reduceMotion = useReducedMotion();
  const [boxWidth, setBoxWidth] = useState(typeof width === 'number' ? width : 0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }
    sweep.value = withRepeat(
      withTiming(1, { duration: MOTION.skeleton.shimmer, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(sweep);
  }, [reduceMotion, sweep]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (sweep.value * 2 - 1) * boxWidth }],
  }));

  return (
    <View
      onLayout={typeof width === 'number' ? undefined : (e) => setBoxWidth(e.nativeEvent.layout.width)}
      style={[styles.bone, { width, height, borderRadius: radius }, style]}
    >
      {reduceMotion || boxWidth === 0 ? null : (
        <Animated.View style={[StyleSheet.absoluteFill, shineStyle]}>
          <LinearGradient
            colors={SHINE}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
};

// A 2:3 cover with a one-line title under it — grids and cover rows.
export const CoverBone = ({ width, coverRadius = 12, meta = true }) => (
  <View style={{ width }}>
    <Bone width={width} height={width * 1.5} radius={coverRadius} />
    <Bone width="80%" height={10} radius={5} style={styles.coverTitle} />
    {meta ? <Bone width="55%" height={8} radius={4} style={styles.coverMeta} /> : null}
  </View>
);

// `count` covers in rows of `columns`, `cellWidth` wide.
export const CoverGridSkeleton = ({ columns, cellWidth, count = columns * 2, gap = 12, rowGap = 18 }) => (
  <View style={[styles.wrap, { columnGap: gap, rowGap }]}>
    {Array.from({ length: count }, (_, i) => (
      <CoverBone key={i} width={cellWidth} />
    ))}
  </View>
);

// A section eyebrow placeholder (11pt caps).
export const EyebrowBone = ({ width = 110, style }) => (
  <Bone width={width} height={10} radius={5} style={style} />
);

// A list row: leading circle or cover, two text lines.
export const RowBone = ({ leading = 40, leadingRadius = leading / 2, style }) => (
  <View style={[styles.row, style]}>
    <Bone width={leading} height={leading} radius={leadingRadius} />
    <View style={styles.rowText}>
      <Bone width="70%" height={12} radius={6} />
      <Bone width="45%" height={9} radius={4} style={styles.rowMeta} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  bone: {
    backgroundColor: DS.colors.surfaceContainerLow,
    overflow: 'hidden',
  },
  coverTitle: {
    marginTop: 8,
  },
  coverMeta: {
    marginTop: 5,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowMeta: {
    marginTop: 7,
  },
});
