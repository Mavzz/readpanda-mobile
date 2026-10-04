import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MOTION } from '../styles/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// 12e `press`: any tappable card springs down (120ms) while held — .96 for
// cards, .94 for covers (`cover` prop). Under Reduce Motion the scale becomes
// a `quick` fade. A drop-in for Pressable: `style` and `children` may still be
// functions of { pressed }. The press scale owns `transform`, so don't pass
// one in `style`.
const PressableScale = ({ cover = false, style, children, onPressIn, onPressOut, ...rest }) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [pressed, setPressed] = useState(false);
  const depth = 1 - (cover ? MOTION.press.scaleCover : MOTION.press.scaleCard);
  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;
  // The Reduce Motion fade scales whatever opacity the caller already set
  // (e.g. a dimmed cell) rather than replacing it.
  const baseOpacity = StyleSheet.flatten(resolvedStyle)?.opacity ?? 1;

  const animatedStyle = useAnimatedStyle(() => (reduceMotion
    ? { opacity: baseOpacity * (1 - progress.value * 0.15) }
    : { transform: [{ scale: 1 - progress.value * depth }] }));

  const animateTo = (value) => {
    progress.value = reduceMotion
      ? withTiming(value, MOTION.quick)
      : withSpring(value, MOTION.press.spring);
  };

  const handlePressIn = (e) => {
    setPressed(true);
    animateTo(1);
    onPressIn?.(e);
  };

  const handlePressOut = (e) => {
    setPressed(false);
    animateTo(0);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[resolvedStyle, animatedStyle]}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  );
};

export default PressableScale;
