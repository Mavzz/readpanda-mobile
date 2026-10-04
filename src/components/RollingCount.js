import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MOTION } from '../styles/motion';

// 12e "counts roll": when a count changes on screen, the old number slides
// out as the new one slides in (200ms) — up when it grows, down when it
// shrinks. Reduce Motion crossfades instead. `display` formats the number
// (e.g. 99+) without changing which way it rolls.
const RollingCount = ({ value, display = String, style }) => {
  const reduceMotion = useReducedMotion();
  const [prev, setPrev] = useState(null);
  const [height, setHeight] = useState(0);
  const last = useRef(value);
  const progress = useSharedValue(1);
  const direction = useSharedValue(1);

  useEffect(() => {
    if (value === last.current) {
      return;
    }
    direction.value = value > last.current ? 1 : -1;
    setPrev(last.current);
    last.current = value;
    progress.value = 0;
    progress.value = withTiming(1, { duration: MOTION.countRoll, easing: MOTION.standard.easing });
  }, [value, progress, direction]);

  const incoming = useAnimatedStyle(() => (reduceMotion
    ? { opacity: progress.value }
    : { transform: [{ translateY: (1 - progress.value) * height * direction.value }] }));
  const outgoing = useAnimatedStyle(() => (reduceMotion
    ? { opacity: 1 - progress.value }
    : {
      opacity: 1 - progress.value,
      transform: [{ translateY: -progress.value * height * direction.value }],
    }));

  return (
    <View style={styles.clip}>
      <Animated.Text
        style={[style, incoming]}
        onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      >
        {display(value)}
      </Animated.Text>
      {prev !== null ? (
        <Animated.Text style={[style, styles.outgoing, outgoing]} pointerEvents="none">
          {display(prev)}
        </Animated.Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  outgoing: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default RollingCount;
