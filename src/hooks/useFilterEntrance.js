import { useRef } from 'react';
import { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { MOTION } from '../styles/motion';

const { step, max, rise } = MOTION.chipStagger;

// 12e chip filter: when the filter changes, the first 9 items fade in and
// rise 6pt, 20ms apart. Returns `enteringFor(index)` for an Animated.View's
// `entering`; key the items by the filter too so they remount on a change.
// Nothing animates on the screen's first load — only on a filter change.
// Reduce Motion: a `quick` fade with no stagger.
const useFilterEntrance = (filter) => {
  const reduceMotion = useReducedMotion();
  const initial = useRef(filter);
  const changed = useRef(false);
  if (filter !== initial.current) {
    changed.current = true;
  }

  return (index) => {
    if (!changed.current || index >= max) {
      return undefined;
    }
    if (reduceMotion) {
      return FadeIn.duration(MOTION.quick.duration);
    }
    return FadeInDown
      .delay(index * step)
      .duration(MOTION.standard.duration)
      .easing(MOTION.standard.easing)
      .withInitialValues({ opacity: 0, transform: [{ translateY: rise }] });
  };
};

export default useFilterEntrance;
