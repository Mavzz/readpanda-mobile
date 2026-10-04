import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { genreDuotone, FAN_SHADOW } from '../utils/covers';
import BookCoverGradient from './BookCoverGradient';

// The live stack on New bucket (11a/11b): the last three picks, newest in
// front, fanned −8° / 2° / 10° like a BucketTile (9c). Slots are fixed —
// front, middle, back — so a new pick pushes the others one slot back and
// the oldest of four fades out; a deselected card drops 12pt and fades while
// the rest slide back into place.
//
// The screen flies a copy of the cover into the front slot (11c) and only
// then adds the book here, so a card appears in place with no animation of
// its own (or crossfades in under Reduce Motion).
export const STACK_WIDTH = 96;
export const STACK_HEIGHT = 84;
export const CARD_WIDTH = 46;
export const CARD_HEIGHT = 66;

// Index 0 is the front.
const SLOTS = [
  { dx: 16, dy: 4, rotate: 10 },
  { dx: 0, dy: -2, rotate: 2 },
  { dx: -16, dy: 2, rotate: -8 },
];
const SLOT_COUNT = SLOTS.length;
const LEAVE_MS = 180;

const slotLeft = (slot) => (STACK_WIDTH - CARD_WIDTH) / 2 + SLOTS[slot].dx;
const slotTop = (slot) => (STACK_HEIGHT - CARD_HEIGHT) / 2 + SLOTS[slot].dy;

// Where the front card sits inside the stack — the flight's destination.
export const FRONT_SLOT = { left: slotLeft(0), top: slotTop(0), rotate: SLOTS[0].rotate };

const StackCard = ({ book, slot, leaving, reduceMotion, zIndex }) => {
  const x = useSharedValue(slotLeft(slot));
  const y = useSharedValue(slotTop(slot));
  const rotate = useSharedValue(SLOTS[slot].rotate);
  const drop = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const timing = { duration: reduceMotion ? 0 : 220, easing: Easing.out(Easing.cubic) };
    x.value = withTiming(slotLeft(slot), timing);
    y.value = withTiming(slotTop(slot), timing);
    rotate.value = withTiming(SLOTS[slot].rotate, timing);
  }, [slot, reduceMotion, x, y, rotate]);

  useEffect(() => {
    if (!leaving) {
      return;
    }
    const timing = { duration: reduceMotion ? 150 : 160 };
    opacity.value = withTiming(0, timing);
    if (leaving === 'drop' && !reduceMotion) {
      drop.value = withTiming(12, timing);
    }
  }, [leaving, reduceMotion, opacity, drop]);

  const style = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    opacity: opacity.value,
    transform: [{ translateY: drop.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      entering={reduceMotion ? FadeIn.duration(150) : undefined}
      style={[styles.card, slot === 0 && FAN_SHADOW, { zIndex }, style]}
    >
      <BookCoverGradient
        coverUrl={book.cover_image_url}
        title={book.title}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        borderRadius={7}
        titleFontSize={6}
      />
    </Animated.View>
  );
};

// `books` are the picks that have landed, oldest first.
const PickStack = ({ books, name, reduceMotion, stackRef }) => {
  const visible = books.slice(-SLOT_COUNT);
  // Cards on their way out, kept mounted until their exit has played:
  // { book, slot, leaving: 'fade' (pushed out by a newer pick) | 'drop' (deselected) }.
  const [leavers, setLeavers] = useState([]);
  const previous = useRef(visible);

  useEffect(() => {
    const before = previous.current;
    previous.current = visible;
    const stillPicked = new Set(books.map((b) => b.book_id));
    const shown = new Set(visible.map((b) => b.book_id));
    const gone = before
      .map((book, i) => ({ book, slot: before.length - 1 - i }))
      .filter(({ book }) => !shown.has(book.book_id))
      .map((g) => ({ ...g, leaving: stillPicked.has(g.book.book_id) ? 'fade' : 'drop' }));
    if (gone.length === 0) {
      return undefined;
    }
    setLeavers((prev) => [...prev.filter((l) => !gone.some((g) => g.book.book_id === l.book.book_id)), ...gone]);
    const timer = setTimeout(() => {
      setLeavers((prev) => prev.filter((l) => !gone.includes(l)));
    }, LEAVE_MS + 40);
    return () => clearTimeout(timer);
  // `visible` is derived from `books`; comparing ids keeps this to real changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((b) => b.book_id).join('|')]);

  const [start, end] = genreDuotone(name || 'New bucket');
  const initial = (name || '').trim().charAt(0).toUpperCase();

  return (
    <View ref={stackRef} collapsable={false} style={styles.box}>
      {visible.length === 0 && leavers.length === 0 ? (
        <View style={[styles.card, styles.emptyCard, { left: slotLeft(1), top: slotTop(1) }]}>
          <LinearGradient
            colors={[start, end]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyGround}
          />
          {initial ? (
            <Text style={styles.initial}>{initial}</Text>
          ) : (
            <Icon name="add" size={18} color={DS.colors.onSurfaceVariant} />
          )}
        </View>
      ) : null}
      {leavers.map((l) => (
        <StackCard
          key={`leaving-${l.book.book_id}`}
          book={l.book}
          slot={Math.min(l.slot, SLOT_COUNT - 1)}
          leaving={l.leaving}
          reduceMotion={reduceMotion}
          zIndex={0}
        />
      ))}
      {visible.map((book, i) => {
        const slot = visible.length - 1 - i;
        return (
          <StackCard
            key={book.book_id}
            book={book}
            slot={slot}
            reduceMotion={reduceMotion}
            zIndex={SLOT_COUNT - slot}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: STACK_WIDTH,
    height: STACK_HEIGHT,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 7,
  },
  emptyCard: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '2deg' }],
  },
  emptyGround: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  initial: {
    fontFamily: DS.font.extraBold,
    fontSize: 20,
    color: DS.colors.onSurfaceVariant,
  },
});

export default PickStack;
