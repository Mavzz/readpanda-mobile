import { View, StyleSheet } from 'react-native';
import BookCoverGradient from './BookCoverGradient';

// The fanned-stack treatment from FIRST_RUN_3a_3b.md § "Bucket / collection
// tiles": the top cover at full size with two more peeking out behind it,
// rotated -7deg and +5deg (the same tilt as the 3b illustration). This is the
// one composite treatment — buckets never get a 2x2 grid as well.
//
// The covers are inset from the tile so the rotated corners have somewhere to
// go, and the fan is drawn back-to-front so the bucket's best-known cover
// lands on top.
const FAN = [
  { rotate: '-7deg', dx: -0.09, dy: 0.02 },
  { rotate: '5deg', dx: 0.09, dy: 0.01 },
  { rotate: '0deg', dx: 0, dy: 0 },
];

const INSET = 0.84;

const CoverStack = ({ books = [], seed, width, height, borderRadius = 14 }) => {
  const coverWidth = Math.round(width * INSET);
  const coverHeight = Math.round(height * INSET);
  // Back-to-front. The list endpoints only ever return a two-book preview, so
  // a bucket known to hold three or more books can be short a cover here —
  // those slots fall back to a duotone seeded off the bucket, which is still
  // an honest "there are more books in here".
  const fanned = [books[2], books[1], books[0]];

  return (
    <View style={[styles.stack, { width, height }]}>
      {fanned.map((book, i) => {
        const { rotate, dx, dy } = FAN[i];
        return (
          <View
            key={book?.book_id ?? book?.id ?? `slot-${i}`}
            style={[
              styles.slot,
              {
                left: (width - coverWidth) / 2 + width * dx,
                top: (height - coverHeight) / 2 + height * dy,
                transform: [{ rotate }],
              },
            ]}
          >
            <BookCoverGradient
              coverUrl={book?.cover_image_url || book?.coverUrl}
              title={book?.title}
              seed={book ? undefined : `${seed}-${i}`}
              width={coverWidth}
              height={coverHeight}
              borderRadius={borderRadius}
              titleFontSize={10}
              elevated
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    position: 'relative',
  },
  slot: {
    position: 'absolute',
  },
});

export default CoverStack;
