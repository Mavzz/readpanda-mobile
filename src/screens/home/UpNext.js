import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import PressableScale from '../../components/PressableScale';
import relativeTime from '../../utils/relativeTime';
import SectionHeader from './SectionHeader';

const LIMITS = { phone: 3, portrait: 5, landscape: 3 };
const GAP = 12;

const Bar = ({ pct }) => (
  <View style={styles.track}>
    <View style={[styles.fill, { width: `${Math.max(pct, 3)}%` }]} />
  </View>
);

// Up next (16b): the rest of My Books' shelf, minus the book in the hero,
// last opened first. Phone and iPad portrait: cover tiles. iPad landscape:
// shelf cards with the page and when it was last read. `books` from
// useHomeSections; `width` is the column it sits in (for the portrait row).
const UpNext = ({ books, variant = 'phone', width, gutter = 24, onOpenBook, onMyBooks }) => {
  const shown = books.slice(0, LIMITS[variant]);
  if (shown.length === 0) {
    return null;
  }

  if (variant === 'landscape') {
    return (
      <View>
        <SectionHeader title="Up next" link="My Books" onLink={onMyBooks} />
        <View style={styles.cards}>
          {shown.map((book) => (
            <PressableScale key={book.id} onPress={() => onOpenBook(book)} style={styles.card} accessibilityRole="button">
              <BookCoverGradient coverUrl={book.coverUrl} title={book.title} width={50} height={72} borderRadius={8} titleFontSize={6} />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle} numberOfLines={1}>{book.title}</Text>
                <Bar pct={book.progressPct} />
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {book.started ? `p. ${book.chapter} · ${relativeTime(book.lastReadAt)}` : 'Not started yet'}
                </Text>
              </View>
            </PressableScale>
          ))}
        </View>
      </View>
    );
  }

  const tileWidth = variant === 'portrait' ? (width - GAP * 4) / 5 : 104;
  const tiles = shown.map((book) => (
    <PressableScale
      key={book.id}
      cover
      onPress={() => onOpenBook(book)}
      style={{ width: tileWidth }}
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${book.started ? `page ${book.chapter}` : 'not started'}`}
    >
      <BookCoverGradient
        coverUrl={book.coverUrl}
        title={book.title}
        width={tileWidth}
        height={variant === 'portrait' ? 176 : 150}
        borderRadius={12}
        titleFontSize={10}
      />
      <Text style={styles.tileTitle} numberOfLines={1}>{book.title}</Text>
      <Bar pct={book.progressPct} />
    </PressableScale>
  ));

  return (
    <View>
      <SectionHeader title="Up next" link="My Books" onLink={onMyBooks} />
      {variant === 'portrait' ? (
        <View style={styles.grid}>{tiles}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter }}
          contentContainerStyle={[styles.grid, { paddingHorizontal: gutter }]}
        >
          {tiles}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: GAP,
  },
  tileTitle: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    marginTop: 7,
    marginBottom: 7,
  },
  track: {
    height: 4,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primaryContainer,
  },
  cards: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 22,
    backgroundColor: DS.colors.surfaceContainer,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
    gap: 7,
  },
  cardTitle: {
    ...DS.type.rowTitle,
    color: DS.colors.onSurface,
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default UpNext;
