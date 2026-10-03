import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <View style={styles.navRow}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.navButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </PressableScale>
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
        </View>
      </SafeAreaView>

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
          <Text style={styles.primaryText}>
            {shelfEntry?.started ? `Continue page ${shelfEntry.chapter}` : 'Start reading'}
          </Text>
        </GradientPill>

        <PressableScale
          onPress={() => setSheet('room')}
          style={styles.secondary}
          accessibilityRole="button"
        >
          <Icon name="people-outline" size={16} color={DS.colors.onSurface} />
          <Text style={styles.secondaryText}>Read with a room</Text>
        </PressableScale>

        {/* Only when there's a real signal — never "0 friends". */}
        {friends?.count > 0 && (
          <View style={styles.social}>
            <View style={styles.avatars}>
              {friends.friends.map((f, i) => (
                <View key={f.user_id} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
                  <Text style={styles.avatarText}>{getInitials(f.username)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.socialText} numberOfLines={2}>{friendsLine(friends)}</Text>
          </View>
        )}
      </ScrollView>

      <PickerSheet
        visible={sheet === 'room'}
        title="Read with a room"
        subtitle={roomsReadingThis.length > 0 ? 'Your rooms reading this book' : null}
        items={roomItems}
        onSelect={onPickRoom}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
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
