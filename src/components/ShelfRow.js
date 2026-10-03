import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from './BookCoverGradient';
import relativeTime from '../utils/relativeTime';
import PressableScale from './PressableScale';
import ProgressFill from './ProgressFill';

// One row of the reading shelf (4a), shared by the full shelf and My Books'
// "Currently reading" (8b), which draws it with a smaller cover. Room rows
// carry the room chip and a social tail; the most recent row gets the
// elevation and the play control.

// A book untouched for 14 days or more is "paused" (10d): its row dims and
// its meta says for how long instead of when it was last read.
const PAUSED_AFTER_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isPaused = (book, now = Date.now()) => (
  !!book.lastReadAt && now - book.lastReadAt >= PAUSED_AFTER_DAYS * DAY_MS
);

const pausedFor = (book) => {
  const days = Math.floor((Date.now() - book.lastReadAt) / DAY_MS);
  if (days >= 60) {
    return `${Math.round(days / 30)} months`;
  }
  return `${Math.round(days / 7)} weeks`;
};

export const metaFor = (book) => {
  const position = book.started
    ? `Page ${book.chapter} of ${book.totalChapters}`
    : 'Not started yet';
  if (isPaused(book)) {
    return `${position} · Paused ${pausedFor(book)}`;
  }
  return `${position} · ${relativeTime(book.lastReadAt)}`;
};

// Room rows carry the social tail: comments waiting where there are any,
// otherwise how the reader stands against the room's pace.
export const socialTailFor = (book, unreadCount = 0) => {
  if (unreadCount > 0) {
    return `${unreadCount} comment${unreadCount > 1 ? 's' : ''} waiting`;
  }
  const members = book.memberProgress || [];
  const me = members.find((m) => m.isMe);
  const ahead = members
    .filter((m) => !m.isMe && m.progressPct > (me?.progressPct || 0))
    .sort((a, b) => b.progressPct - a.progressPct)[0];
  if (!ahead) {
    return 'Caught up';
  }
  const behind = Math.max(
    1,
    Math.round(((ahead.progressPct - (me?.progressPct || 0)) / 100) * book.totalChapters),
  );
  return `${behind} ch. behind`;
};

const ShelfRow = ({
  book,
  isMostRecent = false,
  unreadCount = 0,
  // Other rooms reading this book besides the one the row shows (10d's
  // "AI Learning +1"). One book is one row however many rooms it's in.
  extraRooms = 0,
  coverWidth = 52,
  coverHeight = 74,
  onPress,
  onPlay,
}) => (
  <PressableScale
    onPress={() => onPress(book)}
    style={[
      styles.row,
      isMostRecent && styles.rowElevated,
      isPaused(book) && styles.rowPaused,
    ]}
    accessibilityLabel={`${book.title}, ${metaFor(book)}`}
    accessibilityRole="button"
  >
    <BookCoverGradient
      coverUrl={book.coverUrl}
      title={book.title}
      width={coverWidth}
      height={coverHeight}
      borderRadius={10}
      titleFontSize={8}
    />
    <View style={styles.rowContent}>
      <View style={styles.rowTitleLine}>
        <Text style={styles.rowTitle} numberOfLines={1}>{book.title}</Text>
        {book.roomName ? (
          <View style={styles.roomChip}>
            <Icon name="people" size={11} color={DS.colors.primary} />
            <Text style={styles.roomChipText} numberOfLines={1}>{book.roomName}</Text>
            {extraRooms > 0 ? <Text style={styles.roomChipExtra}>+{extraRooms}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.rowTrack}>
        <ProgressFill
          pct={book.progressPct}
          seenKey={`book:${book.id}`}
          colors={[DS.colors.primary, DS.colors.secondary]}
          style={styles.rowFill}
        />
      </View>

      <Text style={styles.rowMeta} numberOfLines={1}>
        {metaFor(book)}
        {book.roomName ? ' · ' : ''}
        {book.roomName ? (
          <Text style={styles.rowMetaAccent}>{socialTailFor(book, unreadCount)}</Text>
        ) : null}
      </Text>
    </View>

    {/* Only the book you were last in gets a one-tap way back into it. */}
    {isMostRecent && onPlay && (
      <PressableScale
        onPress={() => onPlay(book)}
        accessibilityLabel={`Continue reading ${book.title}`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[DS.colors.primary, DS.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.playButton}
        >
          <Icon name="play" size={15} color={DS.colors.onPrimary} />
        </LinearGradient>
      </PressableScale>
    )}
  </PressableScale>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: 22,
    padding: 14,
    marginBottom: 10,
  },
  rowElevated: {
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  rowPaused: {
    opacity: 0.55,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 130,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  roomChipText: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  roomChipExtra: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  rowTrack: {
    height: 5,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
    overflow: 'hidden',
    marginBottom: 8,
  },
  rowFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    // So a book a few pages in still reads as started rather than as an empty
    // track.
    minWidth: 8,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  rowMetaAccent: {
    color: DS.colors.primary,
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ShelfRow;
