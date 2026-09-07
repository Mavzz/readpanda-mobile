import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { genreDuotone, COVER_SHADOW } from '../utils/covers';
import BookCoverGradient from './BookCoverGradient';
import CoverStack from './CoverStack';

// A bucket's artwork is the books it holds — FIRST_RUN_3a_3b.md § "Tile
// imagery": 3+ books fan into a stack, 1-2 books show a single full-bleed
// cover, and an empty bucket falls back to a genre-tinted duotone carrying the
// bucket's initial. No stock art, no illustration, no icons-as-art.
//
// `bookCount` is what the bucket actually holds; `books` is the (at most
// two-book) preview the list endpoints return, so the count decides the
// treatment and the preview fills whatever covers it can.
const BucketTile = ({ books = [], bookCount, name, genre, width, height, borderRadius = 16 }) => {
  const present = books.filter(Boolean);
  const count = typeof bookCount === 'number' ? bookCount : present.length;

  if (count >= 3) {
    return (
      <CoverStack
        books={present}
        seed={name}
        width={width}
        height={height}
        borderRadius={Math.max(12, borderRadius - 2)}
      />
    );
  }

  if (present.length > 0) {
    const book = present[0];
    return (
      <BookCoverGradient
        coverUrl={book.cover_image_url || book.coverUrl}
        title={book.title || name}
        width={width}
        height={height}
        borderRadius={borderRadius}
        titleFontSize={11}
        elevated
      />
    );
  }

  const [start, end] = genreDuotone(genre || name);
  const initial = (name || '').trim().charAt(0).toUpperCase();

  return (
    <View style={[COVER_SHADOW, { width, height, borderRadius }]}>
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.empty, { width, height, borderRadius }]}
      >
        {initial ? (
          <Text style={styles.initial}>{initial}</Text>
        ) : (
          <Icon name="book-outline" size={Math.round(height * 0.28)} color={DS.colors.onSurfaceVariant} />
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontFamily: DS.font.extraBold,
    fontSize: 28,
    color: DS.colors.onSurfaceVariant,
  },
});

export default BucketTile;
