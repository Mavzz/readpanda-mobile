import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  Path,
  Rect,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
} from 'react-native-svg';

/**
 * ReadPanda Logo — Nocturnal Sanctuary design system.
 *
 * A panda reading a book under warm candlelight, rendered entirely with
 * react-native-svg so it is resolution-independent and themeable.
 *
 * Palette:
 *   background / body fill  #0b1326  (DS.colors.background)
 *   warm glow / primary     #ffddb8  (DS.colors.primary)
 *   golden accent           #ffb95f  (DS.colors.primaryContainer)
 *   panda dark marks        #131b2e  (DS.colors.surfaceContainerLow)
 *   panda light face        #e8c49a  (DS.colors.secondary)
 */
const ReadPandaLogo = ({ size = 160 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Defs>
        {/* Warm ambient glow behind the panda */}
        <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#ffb95f" stopOpacity="0.35" />
          <Stop offset="60%" stopColor="#ffddb8" stopOpacity="0.10" />
          <Stop offset="100%" stopColor="#0b1326" stopOpacity="0" />
        </RadialGradient>

        {/* Outer badge gradient */}
        <LinearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#171f33" />
          <Stop offset="100%" stopColor="#0b1326" />
        </LinearGradient>

        {/* Book cover warm gradient */}
        <LinearGradient id="bookGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#ffddb8" />
          <Stop offset="100%" stopColor="#ffb95f" />
        </LinearGradient>

        {/* Panda face warm fill */}
        <RadialGradient id="faceGrad" cx="50%" cy="40%" r="55%">
          <Stop offset="0%" stopColor="#e8c49a" />
          <Stop offset="100%" stopColor="#c9a87a" />
        </RadialGradient>
      </Defs>

      {/* ── Outer badge circle ── */}
      <Circle cx="80" cy="80" r="76" fill="url(#badgeGrad)" />

      {/* Subtle amber ring border */}
      <Circle
        cx="80"
        cy="80"
        r="75"
        fill="none"
        stroke="#ffddb8"
        strokeWidth="1"
        strokeOpacity="0.18"
      />

      {/* Ambient warm glow overlay */}
      <Circle cx="80" cy="80" r="76" fill="url(#glowGrad)" />

      {/* ══════════════════════════════════════
          PANDA BODY  (seated, books in lap)
          ══════════════════════════════════════ */}

      {/* Body */}
      <Ellipse cx="80" cy="112" rx="30" ry="26" fill="#131b2e" />

      {/* Belly highlight */}
      <Ellipse cx="80" cy="112" rx="19" ry="16" fill="#222a3e" />

      {/* ══════════════════════════════════════
          PANDA HEAD
          ══════════════════════════════════════ */}

      {/* Head */}
      <Circle cx="80" cy="74" r="28" fill="url(#faceGrad)" />

      {/* Left ear (dark outer) */}
      <Circle cx="56" cy="50" r="11" fill="#131b2e" />
      {/* Left ear (inner warm) */}
      <Circle cx="56" cy="50" r="6" fill="#c9a87a" />

      {/* Right ear (dark outer) */}
      <Circle cx="104" cy="50" r="11" fill="#131b2e" />
      {/* Right ear (inner warm) */}
      <Circle cx="104" cy="50" r="6" fill="#c9a87a" />

      {/* ── Eye patches ── */}
      <Ellipse cx="70" cy="71" rx="9" ry="8" fill="#131b2e" />
      <Ellipse cx="90" cy="71" rx="9" ry="8" fill="#131b2e" />

      {/* ── Eyes (white sclera + amber iris) ── */}
      <Circle cx="70" cy="71" r="5" fill="#dae2fd" />
      <Circle cx="90" cy="71" r="5" fill="#dae2fd" />
      {/* Iris */}
      <Circle cx="70" cy="72" r="3" fill="#472a00" />
      <Circle cx="90" cy="72" r="3" fill="#472a00" />
      {/* Catchlight */}
      <Circle cx="71" cy="70" r="1" fill="#ffddb8" />
      <Circle cx="91" cy="70" r="1" fill="#ffddb8" />

      {/* Snout */}
      <Ellipse cx="80" cy="81" rx="8" ry="5" fill="#c9a87a" />

      {/* Nose */}
      <Ellipse cx="80" cy="78" rx="3" ry="2" fill="#472a00" />

      {/* Subtle smile */}
      <Path
        d="M 75 84 Q 80 88 85 84"
        stroke="#472a00"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* ══════════════════════════════════════
          OPEN BOOK held in panda's paws
          ══════════════════════════════════════ */}

      {/* Left page */}
      <Path
        d="M 50 122 Q 50 108 80 107 L 80 128 Q 62 128 50 122 Z"
        fill="url(#bookGrad)"
      />

      {/* Right page */}
      <Path
        d="M 110 122 Q 110 108 80 107 L 80 128 Q 98 128 110 122 Z"
        fill="#ffb95f"
      />

      {/* Book spine highlight */}
      <Rect x="79" y="107" width="2" height="21" fill="#472a00" rx="1" />

      {/* Page lines on left */}
      <Path d="M 58 115 Q 70 114 78 114" stroke="#472a00" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
      <Path d="M 57 119 Q 69 118 78 118" stroke="#472a00" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
      <Path d="M 58 123 Q 70 122 78 122" stroke="#472a00" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />

      {/* Page lines on right */}
      <Path d="M 102 115 Q 90 114 82 114" stroke="#472a00" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
      <Path d="M 103 119 Q 91 118 82 118" stroke="#472a00" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />
      <Path d="M 102 123 Q 90 122 82 122" stroke="#472a00" strokeWidth="0.8" strokeOpacity="0.5" fill="none" />

      {/* Small paw on left book edge */}
      <Ellipse cx="51" cy="122" rx="6" ry="4" fill="#131b2e" />
      <Circle cx="48" cy="120" r="2" fill="#222a3e" />
      <Circle cx="51" cy="119" r="2" fill="#222a3e" />
      <Circle cx="54" cy="120" r="2" fill="#222a3e" />

      {/* Small paw on right book edge */}
      <Ellipse cx="109" cy="122" rx="6" ry="4" fill="#131b2e" />
      <Circle cx="106" cy="120" r="2" fill="#222a3e" />
      <Circle cx="109" cy="119" r="2" fill="#222a3e" />
      <Circle cx="112" cy="120" r="2" fill="#222a3e" />

      {/* ── Warm candlelight sparkle (top-right) ── */}
      <Circle cx="120" cy="34" r="3" fill="#ffddb8" opacity="0.9" />
      <Circle cx="120" cy="34" r="6" fill="#ffb95f" opacity="0.25" />
      <Circle cx="120" cy="34" r="10" fill="#ffddb8" opacity="0.08" />
    </Svg>
  );
};

export default ReadPandaLogo;
