import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MOTION } from '../styles/motion';

// The last value each bar was shown at, for this app session.
const lastSeen = new Map();

// 12e: a progress bar grows from the last value the reader saw (600ms), and
// only when it has changed — a bar seen for the first time, or unchanged,
// just sits at its value. `seenKey` names what the bar measures (e.g.
// `book:42`), so the same book's bar on Home and in My Books share a memory.
// Under Reduce Motion it jumps. Pass `colors` for a left-to-right gradient
// fill; otherwise `style` gives it its colour.
const ProgressFill = ({ pct, seenKey, style, colors }) => {
  const reduceMotion = useReducedMotion();
  const target = Math.max(0, Math.min(100, pct || 0));
  const from = seenKey && lastSeen.has(seenKey) ? lastSeen.get(seenKey) : target;
  const width = useSharedValue(reduceMotion ? target : from);

  useEffect(() => {
    if (seenKey) {
      lastSeen.set(seenKey, target);
    }
    if (reduceMotion) {
      width.value = target;
    } else if (width.value !== target) {
      width.value = withTiming(target, {
        duration: MOTION.progressGrow,
        easing: MOTION.standard.easing,
      });
    }
  }, [target, seenKey, reduceMotion, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <Animated.View style={[style, colors && styles.clip, animatedStyle]}>
      {colors ? (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});

export default ProgressFill;
