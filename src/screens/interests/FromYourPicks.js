import { View, Text, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';

const GAP = 14;
const MAX_COVER = 86;

// "From your picks" (14a): the books the picks lead to, so choosing shows its
// result right away. Hidden when there's nothing to show. Five covers fit the
// column: 86pt wide where there's room, narrower on a phone.
const FromYourPicks = ({ covers, columnWidth }) => {
  if (covers.length === 0) {
    return null;
  }
  const coverWidth = Math.min(MAX_COVER, (columnWidth - GAP * 4) / 5);

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>From your picks</Text>
      <View style={styles.row}>
        {covers.map((book) => (
          <BookCoverGradient
            key={book.book_id}
            coverUrl={book.cover_image_url}
            title={book.title}
            width={coverWidth}
            height={coverWidth * 1.49}
            borderRadius={12}
            titleFontSize={9}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  eyebrow: {
    ...DS.type.eyebrow,
    color: DS.colors.onSurfaceVariant,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
});

export default FromYourPicks;
