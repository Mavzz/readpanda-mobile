import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';
import { genreDuotone, FAN_SHADOW } from '../utils/covers';
import BookCoverGradient from './BookCoverGradient';

// A bucket's artwork is the books it holds (BUCKETS_9a_9c.md § 9c): up to
// three covers fanned at -8° / 2° / 10°, spaced `offset` apart, the last one
// in front with the stack's only shadow. One or two covers centre
// themselves; an empty bucket gets a genre-tinted duotone with its initial.
//
// `layout="hero"` is 9b's arrangement instead: two large side covers at ±10°
// behind an upright centre cover, which is the bucket's first book.
const FAN = [
  { rotate: '-8deg', dx: -1, dy: 2 },
  { rotate: '2deg', dx: 0, dy: -2 },
  { rotate: '10deg', dx: 1, dy: 4 },
];

const CoverFan = ({
  covers = [],
  seed,
  width,
  height,
  coverWidth,
  coverHeight,
  offset = 24,
  borderRadius = 8,
  layout = 'fan',
  // Hero only: the upright centre cover's size.
  centerWidth,
  centerHeight,
}) => {
  const books = covers.filter(Boolean).slice(0, 3);

  if (books.length === 0) {
    const [start, end] = genreDuotone(seed || '');
    const initial = (seed || '').trim().charAt(0).toUpperCase();
    return (
      <View style={[styles.box, { width, height }]}>
        <LinearGradient
          colors={[start, end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.empty,
            FAN_SHADOW,
            { width: coverWidth, height: coverHeight, borderRadius },
          ]}
        >
          <Text style={styles.initial}>{initial}</Text>
        </LinearGradient>
      </View>
    );
  }

  // Back to front: each slot is { book, w, h, rotate, dx, dy }.
  let slots;
  if (layout === 'hero') {
    const [first, second, third] = books;
    const side = (book, sign) => ({
      book,
      w: coverWidth,
      h: coverHeight,
      rotate: `${sign * 10}deg`,
      dx: sign * offset,
      dy: 8,
    });
    slots = [
      second && side(second, -1),
      third && side(third, 1),
      { book: first, w: centerWidth, h: centerHeight, rotate: '0deg', dx: 0, dy: 0 },
    ].filter(Boolean);
  } else {
    // Three use the whole fan; two take its outer tilts half as far apart;
    // one sits in the middle slot.
    let fan = FAN;
    if (books.length === 2) {
      fan = [FAN[0], FAN[2]].map((f) => ({ ...f, dx: f.dx / 2 }));
    } else if (books.length === 1) {
      fan = [FAN[1]];
    }
    slots = books.map((book, i) => ({
      book,
      w: coverWidth,
      h: coverHeight,
      rotate: fan[i].rotate,
      dx: fan[i].dx * offset,
      dy: fan[i].dy,
    }));
  }

  return (
    <View style={[styles.box, { width, height }]}>
      {slots.map((slot, i) => (
        <View
          key={slot.book.book_id ?? `slot-${i}`}
          style={[
            styles.slot,
            { borderRadius },
            i === slots.length - 1 && FAN_SHADOW,
            {
              left: (width - slot.w) / 2 + slot.dx,
              top: (height - slot.h) / 2 + slot.dy,
              transform: [{ rotate: slot.rotate }],
            },
          ]}
        >
          <BookCoverGradient
            coverUrl={slot.book.cover_image_url || slot.book.coverUrl}
            title={slot.book.title}
            width={slot.w}
            height={slot.h}
            borderRadius={borderRadius}
            titleFontSize={Math.max(7, Math.round(slot.w / 8))}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slot: {
    position: 'absolute',
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: DS.font.extraBold,
    fontSize: 22,
    color: DS.colors.onSurfaceVariant,
  },
});

export default CoverFan;
