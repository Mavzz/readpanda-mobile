import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duotoneFor } from '../utils/covers';
import { MOTION } from '../styles/motion';

// The cover → page morph for a reader opened from a widget
// (WIDGETS_13a_13f.md "Motion", 12e "emphasized"). The widget's frame isn't
// available to the app, so the cover starts centred on screen, then grows to
// fill it and fades into the page underneath. Under Reduce Motion it's a
// `quick` crossfade, with no scaling.

const COVER_WIDTH = 132;

const WidgetOpenMorph = ({ book }) => {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);

  const coverHeight = COVER_WIDTH * 1.5;
  // Big enough that the cover covers the whole screen at the end.
  const endScale = Math.max(width / COVER_WIDTH, height / coverHeight);

  useEffect(() => {
    const finish = (finished) => {
      if (finished) {
        runOnJS(setDone)(true);
      }
    };
    const timing = reduceMotion ? MOTION.quick : MOTION.emphasized;
    // A beat on the centred cover first, so the eye has something to follow.
    progress.value = withDelay(MOTION.pageFadeDelay, withTiming(1, timing, finish));
  }, [progress, reduceMotion]);

  const coverStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: reduceMotion ? 1 : 1 + (endScale - 1) * progress.value }],
  }));

  if (done || !book) {
    return null;
  }

  const duotone = duotoneFor(book.title || book.book_id);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      <Animated.View style={[styles.cover, { height: coverHeight }, coverStyle]}>
        {book.cover_image_url ? (
          <Image source={{ uri: book.cover_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={duotone} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: COVER_WIDTH,
    borderRadius: 10,
    overflow: 'hidden',
  },
});

export default WidgetOpenMorph;
