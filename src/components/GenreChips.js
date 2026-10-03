import { useEffect } from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';
import { MOTION } from '../styles/motion';
import PressableScale from './PressableScale';
import haptics from '../utils/haptics';

// The genre chip row (8a), shared by Discover and the "See all" views that
// keep its filter (10c, 10e). "For you" (or `allLabel`) is the unfiltered
// feed and the default; a genre chip is single-select, and tapping the
// selected one again goes back to the unfiltered feed.
//
// `genres` are { value, label } as /discover returns them.
// 12e: the gold fill crossfades in and out (`quick`) rather than snapping.
const Chip = ({ label, selected, onPress }) => {
  const fill = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    fill.value = withTiming(selected ? 1 : 0, MOTION.quick);
  }, [selected, fill]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <PressableScale
      onPress={onPress}
      style={[styles.chip, styles.chipIdle]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Animated.View style={[styles.chipFill, fillStyle]}>
        <LinearGradient
          colors={[DS.colors.primary, DS.colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipFill}
        />
      </Animated.View>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </PressableScale>
  );
};

const GenreChips = ({ genres = [], value, onChange, allLabel = 'For you', gutter = 24 }) => {
  const chip = (label, chipValue) => {
    const selected = value === chipValue;
    return (
      <Chip
        key={label}
        label={label}
        selected={selected}
        onPress={() => {
          haptics.light();
          onChange(chipValue === null || selected ? null : chipValue);
        }}
      />
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.chips, { paddingHorizontal: gutter }]}
    >
      {chip(allLabel, null)}
      {genres.map((g) => chip(g.label, g.value))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chips: {
    paddingVertical: 16,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },
  chipIdle: {
    backgroundColor: DS.colors.surfaceContainer,
  },
  chipFill: {
    ...StyleSheet.absoluteFillObject,
  },
  chipText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  chipTextSelected: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default GenreChips;
