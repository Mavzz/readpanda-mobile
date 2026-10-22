import { View, StyleSheet, ScrollView } from 'react-native';
import BookCoverGradient from '../../components/BookCoverGradient';
import PressableScale from '../../components/PressableScale';
import useDiscoverPages from '../../hooks/useDiscoverPages';
import SectionHeader from './SectionHeader';

const COLUMNS = { phone: 4, portrait: 5, landscape: 6 };
const GAP = 12;

// Popular this week (16b): the same list as Discover's Popular. Phone: four
// covers in a sideways row. iPad: one row of 5 (portrait) or 6 (landscape)
// across the column. Hidden until it has loaded at least once.
const PopularThisWeek = ({ variant = 'phone', width, gutter = 24, onOpenBook, onSeeAll }) => {
  const { page } = useDiscoverPages(null);
  const books = (page?.popular || []).slice(0, COLUMNS[variant]);
  if (books.length === 0) {
    return null;
  }

  const coverWidth = variant === 'phone' ? 80 : (width - GAP * (COLUMNS[variant] - 1)) / COLUMNS[variant];
  // Landscape is 140pt tall on the 11" iPad, where six of those just fit the
  // books column. The 13" in portrait gets this layout too, with a narrower
  // column, so the covers shrink to fit rather than run under Rooms tonight.
  const coverHeight = variant === 'landscape' ? Math.min(140, coverWidth * 1.45) : coverWidth * 1.45;
  const covers = books.map((book) => (
    <PressableScale
      key={book.book_id}
      cover
      onPress={() => onOpenBook(book)}
      accessibilityRole="button"
      accessibilityLabel={book.title}
    >
      <BookCoverGradient
        coverUrl={book.cover_image_url}
        title={book.title}
        width={variant === 'landscape' ? coverHeight / 1.45 : coverWidth}
        height={coverHeight}
        borderRadius={10}
        titleFontSize={9}
      />
    </PressableScale>
  ));

  return (
    <View>
      <SectionHeader title="Popular this week" link="See all" onLink={onSeeAll} />
      {variant === 'phone' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
          contentContainerStyle={[styles.row, { paddingHorizontal: gutter }]}
        >
          {covers}
        </ScrollView>
      ) : (
        <View style={[styles.row, variant === 'landscape' && styles.rowSpread]}>{covers}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  rowSpread: {
    justifyContent: 'space-between',
  },
});

export default PopularThisWeek;
