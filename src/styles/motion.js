import { Easing } from 'react-native-reanimated';

// ─── 12e Motion tokens ───────────────────────────────────────────────────────
// Every animation picks one of these. Under Reduce Motion, transforms become a
// `quick` crossfade with no stagger (haptics stay).

export const MOTION = {
  // Any tappable card: spring down on press-in, back on release.
  press: {
    spring: { duration: 120, dampingRatio: 1 },
    scaleCard: 0.96,
    scaleCover: 0.94,
  },
  // Fades, colour changes, crossfades.
  quick: { duration: 150, easing: Easing.out(Easing.ease) },
  // Layout changes, insert / remove.
  standard: { duration: 250, easing: Easing.bezier(0.2, 0, 0, 1) },
  // Hero morph, flights.
  emphasized: { duration: 380, easing: Easing.bezier(0.3, 0, 0, 1) },
  // Badges: 0 → 1.15 → 1.
  pop: { spring: { dampingRatio: 0.6 }, overshoot: 1.15 },

  // Component-specific values from 12e.
  pageFadeDelay: 80,
  backdrop: 200,
  progressGrow: 600,
  countRoll: 200,
  readerBars: { duration: 180, offset: 8 },
  chipStagger: { step: 20, max: 9, rise: 6 },
  skeleton: { shimmer: 1200, minVisible: 300 },
};
