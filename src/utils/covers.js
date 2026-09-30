// Cover / tile imagery helpers — FIRST_RUN_3a_3b.md § "Tile imagery".
//
// Book covers are the only imagery in the app. Where a cover is missing (or a
// tile has no book behind it at all) we fall back to a dark duotone gradient
// rather than a gray box, hashing the seed text into a hue so the same book or
// bucket always lands on the same, distinct colour.

const hashString = (value) => {
  if (!value) {
    return 0;
  }
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

// HSL → hex in JS rather than handing 'hsl(...)' strings to LinearGradient:
// the native gradient parsers only reliably take hex.
const hslToHex = (h, s, l) => {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ][sector];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// The mockups' three duotones, measured off the HTML prototypes:
// navy #2e3a54→#151d32, plum #41333f→#1c1826, forest #27403c→#131f24.
// Their shared shape — s/l 29%/25% → 41%/14% — is what the hue formula below
// reproduces at an arbitrary hue.
export const GENRE_DUOTONES = {
  navy: ['#2e3a54', '#151d32'],
  plum: ['#41333f', '#1c1826'],
  forest: ['#27403c', '#131f24'],
};

const GENRE_TINTS = Object.values(GENRE_DUOTONES);

// Stable per-title (or per-bucket) duotone: hash → hue, with the same
// lightness and saturation ramp as the mockups' tints so every cover reads as
// the same family. The hue is confined to the arc those three tints sit on —
// forest ~170°, navy ~221°, plum ~309° — because a full-wheel hash would put
// oranges and reds on a screen that is otherwise all night blue.
const HUE_START = 160;
const HUE_SPAN = 170;

export const duotoneFor = (seed) => {
  const hue = HUE_START + (hashString(seed) % HUE_SPAN);
  return [hslToHex(hue, 29, 25), hslToHex(hue, 41, 14)];
};

// Empty buckets are tinted by their dominant genre instead, so two empty
// buckets of different genres don't look like the same placeholder.
export const genreDuotone = (genre) => GENRE_TINTS[hashString(genre) % GENRE_TINTS.length];

// Covers read as physical objects on the dark surface — 0/12/24
// rgba(6,13,32,0.6) per the handoff, expressed as RN shadow props.
export const COVER_SHADOW = {
  shadowColor: '#060d20',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.6,
  shadowRadius: 24,
  elevation: 8,
};

// Bottom scrim for tiles whose label sits on top of the cover.
export const SCRIM_COLORS = ['rgba(6,13,32,0)', 'rgba(6,13,32,0.85)'];

export default { GENRE_DUOTONES, duotoneFor, genreDuotone, COVER_SHADOW, SCRIM_COLORS };
