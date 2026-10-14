import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import GradientPill from '../../components/GradientPill';
import useCommentsStore from '../../stores/commentsStore';
import log from '../../utils/logger';

// Where you are in the room's book, and the way back in (2c / 14i). In the
// design this is the foot of the Schedule card; while schedules are on hold
// (turn 18) it's a card of its own. `book` is from useActiveRoomBook.
//
// The reader knows pages, not chapters, so the line says "Page 31 of 210"
// where the design has "Ch. 2 · Page 31".
const YourPlaceCard = ({ book }) => {
  const navigation = useNavigation();
  const entry = useCommentsStore((s) => s.byBook[book.id]);

  // Unlocked and unread only — a count of locked comments would be a spoiler
  // of how much is coming.
  const waiting = entry?.unreadCount || 0;
  const waitingPages = (entry?.threads || [])
    .filter((t) => t.unreadCount > 0)
    .map((t) => t.page);
  const waitingAt = waitingPages.length ? Math.min(...waitingPages) + 1 : null;

  const place = book.started
    ? `Page ${book.chapter} of ${book.totalChapters}`
    : 'Not started yet';
  let waitingLine = null;
  if (waiting > 0) {
    waitingLine = `${waiting} comment${waiting === 1 ? '' : 's'} waiting${waitingAt ? ` at p. ${waitingAt}` : ''}`;
  }

  const handleContinue = () => {
    log.info('Continue pressed for', book.title, 'in room', book.roomId);
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: book.id,
        title: book.title,
        cover_image_url: book.coverUrl,
        manuscript_url: book.manuscriptUrl,
      },
      // Opens with this room's comment layer on.
      roomId: book.roomId,
    });
  };

  return (
    <View style={styles.card}>
      <BookCoverGradient
        coverUrl={book.coverUrl}
        title={book.title}
        width={38}
        height={54}
        borderRadius={8}
        titleFontSize={6}
      />
      <View style={styles.text}>
        <Text style={styles.place} numberOfLines={1}>{place}</Text>
        {waitingLine ? <Text style={styles.waiting} numberOfLines={1}>{waitingLine}</Text> : null}
      </View>
      <GradientPill onPress={handleContinue} style={styles.cta}>
        <Icon name="play" size={13} color={DS.colors.onPrimary} />
        <Text style={styles.ctaText}>{book.started ? 'Continue' : 'Start'}</Text>
      </GradientPill>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.surfaceContainer,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  place: {
    fontSize: 14,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  waiting: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  cta: {
    height: DS.size.minHit,
    paddingVertical: 0,
    paddingHorizontal: 16,
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default YourPlaceCard;
