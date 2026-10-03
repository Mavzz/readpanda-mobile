import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { trigger } from 'react-native-haptic-feedback';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import PickStack, { CARD_WIDTH, CARD_HEIGHT, FRONT_SLOT } from '../components/PickStack';
import useBucketsStore from '../stores/bucketsStore';
import useBooksStore from '../stores/booksStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import { fetchDiscover } from '../services/discoverService';
import { showToast } from '../components/Toaster';
import { booksLabel } from '../utils/readingTime';
import log from '../utils/logger';
import PressableScale from '../components/PressableScale';
import haptics from '../utils/haptics';
import { bookIdOf, sameId } from '../utils/bookId';
import { CoverGridSkeleton, useSkeletonDelay } from '../components/Skeleton';
import RollingCount from '../components/RollingCount';

// § 11a–11c — New bucket: name it and pick its books in one place.
//
// The header's Create is dim until there's a name; books are optional. The
// identity row is a live BucketTile-style stack of the last three picks next
// to the name field. Below it, search and the source chips (My library,
// recent first, or Discover) stay pinned while the grid scrolls; "Selected · N"
// narrows the grid to your picks.
//
// Selecting a cover rings it in gold, numbers it by its place in the bucket
// and flies a copy into the stack's front slot (11c). Flights overlap rather
// than queue, and tapping a cover mid-flight deselects it and cancels its
// flight. With the stack scrolled away there's no flight: the Selected chip
// pulses instead. Reduce Motion drops the flight and the scaling for fades.
const GUTTER = 24;
const GAP = 12;
const COLUMNS = 3;
const GOLD = DS.colors.primaryContainer; // #ffb95f
const DIM_ACTION = DS.colors.disabled;
const DARKEN = '#000000';
const RING_GAP = 2.5;
const RING_OUTER = 4.5;

const haptic = (type) => trigger(type, { enableVibrateFallback: false });

// The catalogue and Discover disagree on the id field; the bucket API takes
// either as book_id.
const toPickable = (book) => ({
  book_id: bookIdOf(book),
  title: book.title,
  author_name: book.author_name || null,
  cover_image_url: book.cover_image_url || book.coverUrl || null,
});

const measure = (ref) => new Promise((resolve) => {
  if (!ref?.current) {
    resolve(null);
    return;
  }
  ref.current.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
});

/* ── One cover in the grid ───────────────────────────────────────────────── */
const PickCell = ({ book, order, width, reduceMotion, onToggle }) => {
  const height = width * 1.5;
  const coverRef = useRef(null);
  const press = useSharedValue(0);
  const selected = useSharedValue(order > 0 ? 1 : 0);
  const badge = useSharedValue(order > 0 ? 1 : 0);
  const isSelected = order > 0;

  useEffect(() => {
    if (isSelected) {
      selected.value = withTiming(1, { duration: reduceMotion ? 150 : 220 });
      badge.value = reduceMotion
        ? withTiming(1, { duration: 150 })
        : withSequence(
          withTiming(1.15, { duration: 130, easing: Easing.out(Easing.quad) }),
          withSpring(1, { dampingRatio: 0.6, duration: 260 }),
        );
    } else {
      selected.value = withTiming(0, { duration: reduceMotion ? 150 : 160 });
      badge.value = withTiming(0, { duration: reduceMotion ? 150 : 160 });
    }
  }, [isSelected, reduceMotion, selected, badge]);

  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - 0.06 * press.value }],
  }));
  const darkenStyle = useAnimatedStyle(() => ({ opacity: 0.18 * press.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: selected.value,
    transform: [{ scale: reduceMotion ? 1 : 0.94 + 0.06 * selected.value }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.value),
    transform: [{ scale: reduceMotion ? 1 : badge.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        haptic('impactLight');
        press.value = withSpring(1, { duration: 120, dampingRatio: 1 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { duration: 220, dampingRatio: 0.8 });
      }}
      onPress={() => onToggle(book, coverRef)}
      style={{ width }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={isSelected ? `${book.title}, number ${order} in this bucket` : book.title}
    >
      <View style={{ width, height }}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              top: -RING_OUTER,
              left: -RING_OUTER,
              width: width + RING_OUTER * 2,
              height: height + RING_OUTER * 2,
            },
            ringStyle,
          ]}
        />
        <Animated.View ref={coverRef} collapsable={false} style={coverStyle}>
          <BookCoverGradient
            coverUrl={book.cover_image_url}
            title={book.title}
            width={width}
            height={height}
            borderRadius={10}
            titleFontSize={10}
          />
          <Animated.View pointerEvents="none" style={[styles.darken, darkenStyle]} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.badge, { left: width - 18 }, badgeStyle]}>
          {isSelected ? (
            // Keyed by the number, so renumbering crossfades.
            <Animated.Text
              key={order}
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(120)}
              style={styles.badgeText}
            >
              {order}
            </Animated.Text>
          ) : null}
        </Animated.View>
      </View>
      <Text style={[styles.cellTitle, isSelected && styles.cellTitleSelected]} numberOfLines={1}>
        {book.title}
      </Text>
    </Pressable>
  );
};

/* ── A cover's copy on its way to the stack (11c, 80–420ms) ──────────────── */
const Flight = ({ flight, onLand }) => {
  const { book, from, to } = flight;
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      80,
      withTiming(1, { duration: 340, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(onLand)(flight.key);
        }
      }),
    );
  }, [t, onLand, flight.key]);

  // A quadratic bezier between the two centres, bowing up over both.
  const c0 = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const c2 = { x: to.x + CARD_WIDTH / 2, y: to.y + CARD_HEIGHT / 2 };
  const c1 = { x: (c0.x + c2.x) / 2, y: Math.min(c0.y, c2.y) - 120 };

  const style = useAnimatedStyle(() => {
    const u = 1 - t.value;
    const bx = u * u * c0.x + 2 * u * t.value * c1.x + t.value * t.value * c2.x;
    const by = u * u * c0.y + 2 * u * t.value * c1.y + t.value * t.value * c2.y;
    return {
      transform: [
        { translateX: bx - c0.x },
        { translateY: by - c0.y },
        { rotate: `${FRONT_SLOT.rotate * t.value}deg` },
        { scaleX: 1 + (CARD_WIDTH / from.width - 1) * t.value },
        { scaleY: 1 + (CARD_HEIGHT / from.height - 1) * t.value },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.flight,
        { left: from.x, top: from.y, width: from.width, height: from.height },
        style,
      ]}
    >
      <BookCoverGradient
        coverUrl={book.cover_image_url}
        title={book.title}
        width={from.width}
        height={from.height}
        borderRadius={10}
        titleFontSize={10}
      />
    </Animated.View>
  );
};

/* ── Screen ──────────────────────────────────────────────────────────────── */
const CreateBucketScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // From the provider, not a SafeAreaView: inside this full-screen modal a
  // SafeAreaView reported no top inset and the header sat under the clock.
  const insets = useSafeAreaInsets();
  const cellWidth = (width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS;

  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('library');
  const [onlySelected, setOnlySelected] = useState(false);
  // Picks in bucket order. `landed` is the subset already in the stack; a
  // pick joins it when its flight lands (or at once when there's no flight).
  const [picks, setPicks] = useState([]);
  const [landed, setLanded] = useState(() => new Set());
  const [flights, setFlights] = useState([]);
  const [discoverBooks, setDiscoverBooks] = useState(null);
  const [saving, setSaving] = useState(false);

  const books = useBooksStore((s) => s.books);
  const fetchBooks = useBooksStore((s) => s.fetchBooks);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);
  const saveBucket = useBucketsStore((s) => s.saveBucket);

  const rootRef = useRef(null);
  const headerRef = useRef(null);
  const stackRef = useRef(null);
  const flightKey = useRef(0);
  // Mirrors for the async paths (measuring, landing), which must see the
  // picks and flights as they are now, not as they were when they started.
  const picksRef = useRef(picks);
  picksRef.current = picks;
  const flightsRef = useRef(flights);
  flightsRef.current = flights;
  const leaving = useRef(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    loadShelf();
    fetchBooks().then(({ status }) => {
      if (status !== 200 && status !== null) {
        showToast('Couldn\'t load your library', 'error');
      }
    });
  }, [fetchBooks, loadShelf]);

  useEffect(() => {
    if (source !== 'discover' || discoverBooks) {
      return;
    }
    fetchDiscover()
      .then(({ status, response }) => {
        if (status === 200) {
          setDiscoverBooks((response.popular || []).map(toPickable));
        } else {
          log.error('New bucket: Discover failed to load', response);
          setDiscoverBooks([]);
        }
      })
      .catch((error) => {
        log.error('New bucket: Discover failed to load', error);
        setDiscoverBooks([]);
      });
  }, [source, discoverBooks]);

  // My library, the books you've opened most recently first.
  const library = useMemo(() => {
    const recency = Object.fromEntries(shelf.map((b) => [String(b.id), b.lastReadAt || 0]));
    return books
      .map(toPickable)
      .map((book, i) => ({ book, i }))
      .sort((a, b) => (recency[String(b.book.book_id)] || 0) - (recency[String(a.book.book_id)] || 0) || a.i - b.i)
      .map(({ book }) => book);
  }, [books, shelf]);

  const orderById = useMemo(
    () => Object.fromEntries(picks.map((b, i) => [String(b.book_id), i + 1])),
    [picks],
  );

  const grid = useMemo(() => {
    const base = onlySelected ? picks : (source === 'discover' ? discoverBooks || [] : library);
    const q = query.trim().toLowerCase();
    if (!q) {
      return base;
    }
    return base.filter((b) => (
      (b.title || '').toLowerCase().includes(q) || (b.author_name || '').toLowerCase().includes(q)
    ));
  }, [onlySelected, picks, source, discoverBooks, library, query]);

  // Leaving with picks asks first — the close button, a swipe, or back.
  useEffect(() => navigation.addListener('beforeRemove', (e) => {
    if (picks.length === 0 || leaving.current) {
      return;
    }
    e.preventDefault();
    Alert.alert(
      'Discard bucket?',
      `Your ${booksLabel(picks.length)} won't be saved.`,
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            leaving.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ],
    );
  }), [navigation, picks.length]);

  // Native-stack can't hold a swipe-dismiss in beforeRemove, so with picks
  // the gesture is off and leaving goes through the confirm above.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: picks.length === 0 });
  }, [navigation, picks.length]);

  const land = useCallback((key) => {
    const flight = flightsRef.current.find((f) => f.key === key);
    if (!flight) {
      return;
    }
    setFlights((prev) => prev.filter((f) => f.key !== key));
    setLanded((l) => new Set(l).add(String(flight.book.book_id)));
    haptic('soft');
  }, []);

  const pulseChip = () => {
    pulse.value = withSequence(withTiming(1.08, { duration: 120 }), withSpring(1, { dampingRatio: 0.6 }));
  };

  const landNow = (book) => {
    setLanded((l) => new Set(l).add(String(book.book_id)));
    haptic('soft');
  };

  const select = async (book, coverRef) => {
    setPicks((prev) => [...prev, book]);
    if (reduceMotion) {
      landNow(book);
      return;
    }
    const [root, header, stack, cover] = await Promise.all([
      measure(rootRef), measure(headerRef), measure(stackRef), measure(coverRef),
    ]);
    // Deselected while it was being measured: nothing to fly.
    if (!picksRef.current.some((b) => sameId(b.book_id, book.book_id))) {
      return;
    }
    const stackVisible = stack && header && stack.y + stack.height / 2 > header.y + header.height;
    if (!root || !cover || !stackVisible) {
      landNow(book);
      pulseChip();
      return;
    }
    flightKey.current += 1;
    setFlights((prev) => [...prev, {
      key: flightKey.current,
      book,
      from: { x: cover.x - root.x, y: cover.y - root.y, width: cover.width, height: cover.height },
      to: { x: stack.x - root.x + FRONT_SLOT.left, y: stack.y - root.y + FRONT_SLOT.top },
    }]);
  };

  const deselect = (book) => {
    const id = String(book.book_id);
    // Mid-flight: the flight is cancelled with the pick, nothing lands.
    setFlights((prev) => prev.filter((f) => String(f.book.book_id) !== id));
    setPicks((prev) => prev.filter((b) => String(b.book_id) !== id));
    setLanded((l) => {
      const next = new Set(l);
      next.delete(id);
      return next;
    });
  };

  const toggle = (book, coverRef) => {
    if (orderById[String(book.book_id)]) {
      deselect(book);
    } else {
      select(book, coverRef);
    }
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) {
      return;
    }
    setSaving(true);
    const { status } = await saveBucket(trimmed, picks.map((b) => b.book_id));
    setSaving(false);
    if (status === 200 || status === 201) {
      haptics.success();
      showToast(`"${trimmed}" created`, 'success');
      leaving.current = true;
      navigation.goBack();
    } else {
      showToast('Couldn\'t create the bucket', 'error');
    }
  };

  const stackBooks = picks.filter((b) => landed.has(String(b.book_id)));
  const canCreate = name.trim().length > 0 && !saving;
  const chipPulse = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const sourceChip = (label, value) => {
    const active = !onlySelected && source === value;
    return (
      <PressableScale
        key={value}
        onPress={() => {
          setOnlySelected(false);
          setSource(value);
        }}
        style={[styles.chip, active && styles.chipActive]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </PressableScale>
    );
  };

  const emptyText = () => {
    if (query.trim()) {
      return `Nothing matches "${query.trim()}".`;
    }
    if (onlySelected) {
      return 'No books picked yet.';
    }
    if (source === 'discover' && discoverBooks === null) {
      return null;
    }
    return 'No books here yet.';
  };
  const showSkeleton = useSkeletonDelay(grid.length === 0 && emptyText() === null);

  return (
    <View ref={rootRef} collapsable={false} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <View style={{ paddingTop: insets.top }}>
        <View ref={headerRef} collapsable={false} style={styles.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.close}
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Icon name="close" size={20} color={DS.colors.onSurfaceVariant} />
          </PressableScale>
          <Text style={styles.headerTitle}>New bucket</Text>
          <Pressable
            onPress={create}
            disabled={!canCreate}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canCreate }}
          >
            <Text style={[styles.create, canCreate && styles.createReady]}>Create</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Identity row */}
        <View style={styles.identity}>
          <PickStack books={stackBooks} name={name} reduceMotion={reduceMotion} stackRef={stackRef} />
          <View style={styles.identityText}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Name your bucket"
              placeholderTextColor={DS.colors.placeholder}
              maxLength={40}
              autoFocus
              returnKeyType="done"
            />
            {stackBooks.length === 0 ? (
              <Text style={[styles.countText, styles.countRow]}>No books yet</Text>
            ) : (
              <View style={styles.countRow}>
                <RollingCount value={stackBooks.length} style={styles.countText} />
                <Text style={styles.countText}> {stackBooks.length === 1 ? 'book' : 'books'}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Search and sources, pinned while the grid scrolls */}
        <View style={styles.pinned}>
          <View style={styles.search}>
            <Icon name="search" size={16} color={DS.colors.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search titles or authors"
              placeholderTextColor={DS.colors.placeholder}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                <Icon name="close-circle" size={16} color={DS.colors.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.chips}>
            {sourceChip('My library', 'library')}
            {sourceChip('Discover', 'discover')}
            <View style={styles.chipSpacer} />
            {picks.length > 0 ? (
              <Animated.View style={chipPulse}>
                <PressableScale
                  onPress={() => setOnlySelected((v) => !v)}
                  style={[
                    styles.chip,
                    styles.selectedChip,
                    onlySelected && styles.selectedChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: onlySelected }}
                >
                  <View style={styles.countRowInline}>
                    <Text style={[styles.chipText, styles.selectedChipText, onlySelected && styles.chipTextActive]}>
                      Selected ·{' '}
                    </Text>
                    <RollingCount
                      value={picks.length}
                      style={[styles.chipText, styles.selectedChipText, onlySelected && styles.chipTextActive]}
                    />
                  </View>
                </PressableScale>
              </Animated.View>
            ) : null}
          </View>
        </View>

        {/* Grid */}
        {showSkeleton ? (
          <View style={styles.grid}>
            <CoverGridSkeleton columns={COLUMNS} cellWidth={cellWidth} count={COLUMNS * 3} gap={GAP} rowGap={20} />
          </View>
        ) : grid.length > 0 ? (
          <View style={styles.grid}>
            {grid.map((book) => (
              <PickCell
                key={book.book_id}
                book={book}
                order={orderById[String(book.book_id)] || 0}
                width={cellWidth}
                reduceMotion={reduceMotion}
                onToggle={toggle}
              />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            {emptyText() ? <Text style={styles.emptyText}>{emptyText()}</Text> : null}
          </View>
        )}
      </ScrollView>

      {/* Flights draw over everything and never take touches. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {flights.map((flight) => (
          <Flight key={flight.key} flight={flight} onLand={land} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  create: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DIM_ACTION,
  },
  createReady: {
    color: GOLD,
  },

  content: {
    paddingBottom: 40,
  },

  // Identity row
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: GUTTER,
    paddingTop: 8,
    paddingBottom: 18,
  },
  identityText: {
    flex: 1,
  },
  nameInput: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    paddingVertical: 4,
  },
  countRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  countRowInline: {
    flexDirection: 'row',
  },
  countText: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },

  // Pinned search + chips
  pinned: {
    backgroundColor: DS.colors.background,
    paddingHorizontal: GUTTER,
    paddingBottom: 14,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainer,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurface,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  chipSpacer: {
    flex: 1,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: GOLD,
  },
  chipText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  chipTextActive: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  selectedChip: {
    backgroundColor: DS.colors.background,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 6.5,
  },
  selectedChipActive: {
    backgroundColor: GOLD,
  },
  selectedChipText: {
    color: GOLD,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GAP,
    rowGap: 20,
    paddingHorizontal: GUTTER,
    paddingTop: 6,
  },
  // A 2px gold band 2.5px off the cover; the gap shows the page through.
  ring: {
    position: 'absolute',
    borderRadius: 10 + RING_OUTER,
    borderWidth: RING_OUTER - RING_GAP,
    borderColor: GOLD,
  },
  darken: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
    backgroundColor: DARKEN,
  },
  badge: {
    position: 'absolute',
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  cellTitle: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
    marginTop: 9,
  },
  cellTitleSelected: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary, // #ffddb8
  },

  flight: {
    position: 'absolute',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: GUTTER,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

export default CreateBucketScreen;
