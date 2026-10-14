import { View, Text, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';

const DOT = 28;

// Every member as a dot along the book at their position, yours ringed in
// amber (2c / 14i). Positions come from the same progress record the reader
// and Home use, so they agree. `book` is from useActiveRoomBook.
//
// The line under it names where most of the room is. Positions are pages,
// not chapters, so it says "around p. 64" where the design has "in Ch. 3".
const roomLine = (book) => {
  const others = (book.memberProgress || []).filter((m) => !m.isMe);
  if (others.length === 0) {
    return 'Just you so far. Invite people to read along.';
  }
  const sorted = others.map((m) => m.progressPct).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (book.totalChapters > 0) {
    return `Most of the room is around p. ${Math.max(1, Math.round((median / 100) * book.totalChapters))}.`;
  }
  return `Most of the room is ${median}% in.`;
};

const WhereEveryoneIs = ({ book }) => {
  const members = book.memberProgress || [];
  if (members.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Where everyone is</Text>
      {/* The dots are laid out on a track one dot narrower than the card, so
          one at 100% still sits inside it. */}
      <View style={styles.trackArea} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.track} />
        {members.map((m) => (
          <View
            key={m.userId}
            style={[
              styles.dot,
              { left: `${Math.min(100, Math.max(0, m.progressPct))}%` },
              m.isMe ? styles.dotMe : styles.dotOther,
            ]}
          >
            <Text style={styles.dotText}>{m.initials}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.caption}>{roomLine(book)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.surfaceContainer,
  },
  eyebrow: {
    ...DS.type.eyebrow,
    color: DS.colors.onSurfaceVariant,
  },
  trackArea: {
    height: 40,
    marginRight: DOT,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: -DOT,
    top: 18,
    height: 4,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
  },
  dot: {
    position: 'absolute',
    top: 6,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  // Yours: an amber ring. Everyone else: a ring in the card colour, so
  // overlapping dots stay distinct.
  dotMe: {
    borderColor: DS.colors.primaryContainer,
  },
  dotOther: {
    borderColor: DS.colors.surfaceContainer,
  },
  dotText: {
    fontSize: 10,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  caption: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
});

export default WhereEveryoneIs;
