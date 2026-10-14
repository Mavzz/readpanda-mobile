import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import PickerSheet from '../components/PickerSheet';
import useReadingProgressStore from '../stores/readingProgressStore';
import useBucketsStore from '../stores/bucketsStore';
import useRoomStore from '../stores/roomStore';
import usePlusGate from '../hooks/usePlusGate';
import { fetchBookDetail } from '../services/discoverService';
import getInitials from '../utils/getInitials';
import { toReaderBook } from '../utils/readerBook';
import { bookIdOf, sameId } from '../utils/bookId';
import log from '../utils/logger';
import PressableScale from '../components/PressableScale';
import useLayout from '../hooks/useLayout';

// § 8c — Book detail, for a book found while browsing (Discover, a bucket,
// search). Reading solo is the default: "Start reading" goes straight into the
// book with no room and no setup, and a room is the secondary option. Books
// already on the shelf open from there into 4b/1b instead — this screen never
// shows the pace card, that's 4b's.
const NEW_ITEM = '__new';

// "Grace has read this" / "Grace and Ravi have read this" /
// "Grace, Ravi and 2 others have read this".
const friendsLine = ({ count, friends }) => {
  const names = friends.map((f) => f.username);
  const others = count - names.length;
  if (others > 0) {
    return `${names.join(', ')} and ${others} other${others > 1 ? 's' : ''} have read this`;
  }
  if (names.length === 1) {
    return `${names[0]} has read this`;
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} have read this`;
};

const BookDetailScreen = () => {
  const navigation = useNavigation();
  const gate = usePlusGate();
  const route = useRoute();
  // Whatever the caller had — a Popular cover, a bucket row — renders at once;
  // the detail fetch fills in the blurb, buckets and friends behind it.
  const seed = route?.params?.book || {};
  const bookId = bookIdOf(seed);

  const [detail, setDetail] = useState(null);
  const [inBuckets, setInBuckets] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState(null);
  const { sizeClass, isLarge } = useLayout();
  // On iPad the two sheets open as popovers off the buttons that own them.
  const roomAnchor = useRef(null);
  const bucketAnchor = useRef(null);

  const shelfEntry = useReadingProgressStore((s) => s.shelf.find((b) => sameId(b.id, bookId)));
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);
  const startBook = useReadingProgressStore((s) => s.startBook);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const addBookToBucket = useBucketsStore((s) => s.addBookToBucket);
  const removeBookFromBucket = useBucketsStore((s) => s.removeBookFromBucket);
  const rooms = useRoomStore((s) => s.rooms);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);

  const loadDetail = useCallback(async () => {
    if (!bookId) {
      return;
    }
    try {
      const { status, response } = await fetchBookDetail(bookId);
      if (status === 200) {
        setDetail(response);
        setInBuckets(response.in_buckets || []);
      } else {
        log.error('Failed to load book detail:', bookId, response);
      }
    } catch (error) {
      log.error('Failed to load book detail:', bookId, error);
    }
  }, [bookId]);

  useEffect(() => {
    loadDetail();
    fetchCustomBuckets();
    // Rooms are usually already loaded by Home; read the flag at call time
    // so loading them doesn't re-run this effect.
    if (!useRoomStore.getState().roomsLoaded) {
      fetchRooms();
    }
  }, [loadDetail, fetchCustomBuckets, fetchRooms]);

  // Coming back from the reader, the button has to say "Continue page …".
  useFocusEffect(
    useCallback(() => {
      loadShelf();
    }, [loadShelf]),
  );

  const book = { ...seed, ...(detail?.book || {}), book_id: bookId };
  // The shape ManuscriptScreen, startBook and CreateRoomScreen all take.
  const readerBook = toReaderBook(book);

  // The PDF reports its length once anyone opens it; until the catalogue
  // has caught up, this reader's own copy of it will do.
  const pages = book.page_count || (shelfEntry?.started ? shelfEntry.totalChapters : null);
  const meta = [
    book.author_name,
    pages ? `${pages} pages` : null,
    book.subgenre || book.genre,
  ].filter(Boolean).join(' · ');

  const friends = detail?.friends_read;
  const roomsReadingThis = rooms.filter((r) => sameId(r.currentBookId, bookId));

  const startReading = () => {
    // A book with no entry yet gets a standalone one, so it shows up under
    // My Books › Reading solo. One that already has an entry keeps it as it
    // is — startBook would rewrite it without its room.
    if (!shelfEntry) {
      startBook(readerBook);
    }
    log.info('Book detail → reader:', book.title);
    navigation.navigate('ManuscriptScreen', { book: readerBook });
  };

  const onPickRoom = (item) => {
    setSheet(null);
    if (item.id === NEW_ITEM) {
      // 2b, pre-filled. Any solo progress carries over when the room attaches.
      gate('rooms', () => navigation.navigate('CreateRoomScreen', { seedBook: readerBook }));
      return;
    }
    navigation.navigate('RoomLobbyScreen', { room: rooms.find((r) => r.id === item.id) });
  };

  const onPickBucket = (item) => {
    if (item.id === NEW_ITEM) {
      setSheet(null);
      gate('buckets', () => navigation.navigate('CreateBucketScreen'));
      return;
    }
    if (inBuckets.includes(item.id)) {
      setInBuckets((prev) => prev.filter((id) => id !== item.id));
      removeBookFromBucket(item.id, bookId).then((ok) => {
        if (!ok) {
          setInBuckets((prev) => [...prev, item.id]);
        }
      });
    } else {
      setInBuckets((prev) => [...prev, item.id]);
      addBookToBucket(item.id, readerBook).then((ok) => {
        if (!ok) {
          setInBuckets((prev) => prev.filter((id) => id !== item.id));
        }
      });
    }
  };

  const roomItems = [
    ...roomsReadingThis.map((r) => ({
      id: r.id,
      title: r.name,
      subtitle: `Reading this · ${r.members.length} member${r.members.length === 1 ? '' : 's'}`,
      icon: 'people',
    })),
    { id: NEW_ITEM, title: 'Start a new room', subtitle: 'Your progress carries over', icon: 'add' },
  ];

  const bucketItems = [
    ...customBuckets.map((b) => ({
      id: b.id,
      title: b.name,
      subtitle: `${b.bookCount} ${b.bookCount === 1 ? 'book' : 'books'}`,
      isBucket: true,
      checked: inBuckets.includes(b.id),
    })),
    { id: NEW_ITEM, title: 'New bucket', icon: 'add' },
  ];

  const primaryLabel = shelfEntry?.started ? `Continue page ${shelfEntry.chapter}` : 'Start reading';

  // Only when there's a real signal — never "0 friends".
  const social = friends?.count > 0 ? (
    <View style={[styles.social, isLarge && styles.socialLarge]}>
      <View style={styles.avatars}>
        {friends.friends.map((f, i) => (
          <View key={f.user_id} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
            <Text style={styles.avatarText}>{getInitials(f.username)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.socialText} numberOfLines={2}>{friendsLine(friends)}</Text>
    </View>
  ) : null;

  const phoneContent = (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <BookCoverGradient
        coverUrl={book.cover_image_url}
        title={book.title}
        width={150}
        height={216}
        borderRadius={16}
        titleFontSize={16}
        style={styles.cover}
      />

      <Text style={styles.title}>{book.title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}

      {book.description ? (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityHint={expanded ? 'Collapses the description' : 'Shows the full description'}
        >
          <Text style={styles.blurb} numberOfLines={expanded ? undefined : 3}>
            {book.description}
          </Text>
        </Pressable>
      ) : null}

      <GradientPill onPress={startReading} style={styles.primary}>
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </GradientPill>

      <PressableScale
        onPress={() => setSheet('room')}
        style={styles.secondary}
        accessibilityRole="button"
      >
        <Icon name="people-outline" size={16} color={DS.colors.onSurface} />
        <Text style={styles.secondaryText}>Read with a room</Text>
      </PressableScale>

      {social}
    </ScrollView>
  );

  // 14c: the cover on the left, everything else in a column of up to 620pt,
  // sized so the page fits without scrolling. The same content and actions as
  // the phone; + in the action row is the phone's bookmark button.
  const wide = sizeClass === 'wide';
  // The genre moves up into the eyebrow, so the line under the title is
  // the rest of the phone's meta.
  const byline = [book.author_name, pages ? `${pages} pages` : null].filter(Boolean).join(' · ');
  const coverWidth = wide ? 280 : 200;
  const largeContent = (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.largeContent, wide ? styles.largeContentWide : styles.largeContentRegular]}
    >
      <View style={[styles.largeCoverSide, wide ? styles.largeCoverSideWide : styles.largeCoverSideRegular]}>
        <BookCoverGradient
          coverUrl={book.cover_image_url}
          title={book.title}
          width={coverWidth}
          height={coverWidth * 1.5}
          borderRadius={18}
          titleFontSize={20}
          style={styles.cover}
        />
      </View>

      <View style={styles.largeBody}>
        <View style={styles.largeHeading}>
          {book.subgenre || book.genre ? (
            <Text style={styles.eyebrow}>{book.subgenre || book.genre}</Text>
          ) : null}
          <Text style={styles.titleLarge}>{book.title}</Text>
          {byline ? <Text style={styles.authorLarge}>{byline}</Text> : null}
        </View>

        <View style={styles.actionRow}>
          <GradientPill onPress={startReading} style={styles.primaryLarge}>
            <Icon name="book" size={16} color={DS.colors.onPrimary} />
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </GradientPill>
          <View ref={roomAnchor} collapsable={false}>
            <PressableScale
              onPress={() => setSheet('room')}
              style={styles.secondaryLarge}
              accessibilityRole="button"
            >
              <Icon name="people-outline" size={17} color={DS.colors.onSurface} />
              <Text style={styles.secondaryTextLarge}>Read with a room</Text>
            </PressableScale>
          </View>
          <View ref={bucketAnchor} collapsable={false}>
            <PressableScale
              onPress={() => setSheet('bucket')}
              style={styles.addLarge}
              accessibilityLabel="Add to bucket"
              accessibilityRole="button"
            >
              <Icon
                name={inBuckets.length > 0 ? 'bookmark' : 'add'}
                size={inBuckets.length > 0 ? 19 : 22}
                color={inBuckets.length > 0 ? DS.colors.primary : DS.colors.onSurface}
              />
            </PressableScale>
          </View>
        </View>

        {book.description ? <Text style={styles.blurbLarge}>{book.description}</Text> : null}

        {social}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <View style={[styles.navRow, isLarge && styles.navRowLarge]}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.navButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </PressableScale>
          {isLarge ? null : (
            <PressableScale
              onPress={() => setSheet('bucket')}
              style={styles.navButton}
              accessibilityLabel="Add to bucket"
              accessibilityRole="button"
            >
              <Icon
                name={inBuckets.length > 0 ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={DS.colors.primary}
              />
            </PressableScale>
          )}
        </View>
      </SafeAreaView>

      {isLarge ? largeContent : phoneContent}

      <PickerSheet
        anchorRef={roomAnchor}
        visible={sheet === 'room'}
        title="Read with a room"
        subtitle={roomsReadingThis.length > 0 ? 'Your rooms reading this book' : null}
        items={roomItems}
        onSelect={onPickRoom}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        anchorRef={bucketAnchor}
        visible={sheet === 'bucket'}
        title="Add to bucket"
        subtitle={book.title}
        items={bucketItems}
        onSelect={onPickBucket}
        onClose={() => setSheet(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  cover: {
    shadowColor: DS.colors.surfaceContainerLowest,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 12,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  meta: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
  },
  blurb: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 14,
  },
  primary: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
  primaryText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  secondary: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  secondaryText: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  navRowLarge: {
    paddingHorizontal: 32,
  },
  largeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 40,
  },
  largeContentWide: {
    gap: 56,
    paddingHorizontal: 64,
  },
  largeContentRegular: {
    gap: 36,
    paddingHorizontal: DS.layout.pagePad.regular,
  },
  largeCoverSide: {
    alignItems: 'center',
  },
  largeCoverSideWide: {
    width: 340,
  },
  largeCoverSideRegular: {
    width: 240,
  },
  largeBody: {
    flex: 1,
    minWidth: 0,
    maxWidth: 620,
    gap: 22,
  },
  largeHeading: {
    gap: 8,
  },
  eyebrow: {
    ...DS.type.eyebrow,
    color: DS.colors.onSurfaceVariant,
  },
  titleLarge: {
    fontSize: 36,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  authorLarge: {
    fontSize: 16,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryLarge: {
    height: 50,
    paddingHorizontal: 28,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryLarge: {
    height: 50,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  secondaryTextLarge: {
    fontSize: 15,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  addLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurbLarge: {
    fontSize: 15,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 25,
  },
  socialLarge: {
    marginTop: 0,
  },
  social: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerLow,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: DS.colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatarText: {
    fontSize: 9,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  socialText: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default BookDetailScreen;
