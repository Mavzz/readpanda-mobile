import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import log from '../../utils/logger';
import { DS } from '../../styles/global';
import useAuthStore from '../../stores/authStore';
import useRoomStore from '../../stores/roomStore';
import usePlusGate from '../../hooks/usePlusGate';
import useLayout from '../../hooks/useLayout';
import useReadingProgressStore, { roomMembersOf } from '../../stores/readingProgressStore';
import findReaderBook, { toReaderBook } from '../../utils/readerBook';
import useHomeData from './useHomeData';
import useHomeSections from './useHomeSections';
import HomeHeader from './HomeHeader';
import ContinueHero from './ContinueHero';
import RoomNudgeHero from './RoomNudgeHero';
import FirstRunHero from './FirstRunHero';
import YourWeek from './YourWeek';
import RoomsTonight from './RoomsTonight';
import NewInRooms from './NewInRooms';
import UpNext from './UpNext';
import PopularThisWeek from './PopularThisWeek';
import CuratedForYou from './CuratedForYou';
import HomeSkeleton from './HomeSkeleton';
import HomePhone from './layouts/HomePhone';
import HomePortrait from './layouts/HomePortrait';
import HomeLandscape from './layouts/HomeLandscape';
import { useSkeletonDelay } from '../../components/Skeleton';

const PHONE_GUTTER = 24;
const SPLIT_GAP = 20;

// Home (turn 16): Continue, Your week, Rooms tonight, New in your rooms, Up
// next and Popular this week — each hidden when it has nothing to say. The
// phone stacks them (16a/16b); iPad lays them out by width (16c landscape,
// 16d portrait). First run (3a) — no book and no rooms — is its own screen.
const Home = ({ navigation }) => {
  const gate = usePlusGate();
  const user = useAuthStore((s) => s.user);
  const rooms = useRoomStore((s) => s.rooms);
  const roomsLoaded = useRoomStore((s) => s.roomsLoaded);
  const activeBook = useReadingProgressStore((s) => s.activeBook);
  const activeBookLoaded = useReadingProgressStore((s) => s.activeBookLoaded);
  const startBook = useReadingProgressStore((s) => s.startBook);
  const { sizeClass, isLarge, pagePad, width } = useLayout();

  const { refreshing, onRefresh } = useHomeData({ user, navigation });
  const sections = useHomeSections();

  const username = user?.username || 'Reader';

  // ── First-run state (FIRST_RUN_3a_3b.md § 3a) ──────────────────────────
  // No book and no rooms. A room but no book keeps this screen, with the
  // room nudge as its hero (R1.5).
  const ready = activeBookLoaded && roomsLoaded;
  const hasRooms = rooms.length > 0;
  const isFirstRun = ready && !activeBook && !hasRooms;
  const roomAwaitingBook = rooms.find((r) => !r.currentBookTitle);

  const openReader = (book, roomId = null) => {
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: book.id,
        title: book.title,
        cover_image_url: book.coverUrl,
        manuscript_url: book.manuscriptUrl,
      },
      ...(roomId ? { roomId } : {}),
    });
  };

  const openRoom = (room) => navigation.navigate('RoomLobbyScreen', { room });

  // "Start" on a room you haven't begun (16e): the room's book from p. 1,
  // with that room's comment layer.
  const startRoomBook = async (room) => {
    const book = room.currentBook
      ? toReaderBook(room.currentBook)
      : await findReaderBook(room.currentBookId);
    if (!book) {
      log.error('No book to start for room', room.id);
      openRoom(room);
      return;
    }
    startBook(book, { roomId: room.id, roomName: room.name, roomMembers: roomMembersOf(room) });
    navigation.navigate('ManuscriptScreen', { book, roomId: room.id });
  };

  const openBucket = (bucket) => {
    navigation.navigate('CuratedBucket', { bucketId: bucket.id, name: bucket.name });
  };
  const browseBooks = () => navigation.navigate('Discover');
  const seeAllCurated = (bucketIds) => navigation.navigate('BookGrid', {
    source: 'curatedForYou',
    title: 'Curated for you',
    bucketIds,
  });
  const createRoom = () => gate('rooms', () => navigation.navigate('CreateRoomScreen'));
  // Rooms tab with the invite-code field already focused.
  const joinByCode = () => navigation.navigate('Rooms', { focusCode: true });

  // Until the shelf and rooms are in, the hero area has nothing true to say.
  // A book already on the nightstand shows straight away.
  const showSkeleton = useSkeletonDelay(!user || (!ready && !activeBook));

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <SafeAreaView style={styles.safeTop} edges={['top']}>
          {showSkeleton ? <HomeSkeleton /> : null}
        </SafeAreaView>
      </View>
    );
  }

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[DS.colors.primary]}
      tintColor={DS.colors.primary}
    />
  );

  const header = (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <HomeHeader
        username={username}
        showBell={!isFirstRun}
        onOpenProfile={() => navigation.navigate('Profile')}
      />
    </SafeAreaView>
  );

  if (isFirstRun) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        {header}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <FirstRunHero onBrowse={browseBooks} onCreateRoom={createRoom} />
          <View style={styles.firstRunJoin}>
            <RoomsTonight items={[]} ready onJoinByCode={joinByCode} />
          </View>
          {/* Curated buckets live in Discover. A first-run reader still gets
              them here — that's onboarding, not browsing. */}
          <CuratedForYou isFirstRun onOpenBucket={openBucket} onSeeAll={seeAllCurated} />
        </ScrollView>
      </View>
    );
  }

  // ── The full Home ──────────────────────────────────────────────────────
  const gutter = isLarge ? pagePad : PHONE_GUTTER;
  const contentWidth = width - gutter * 2;
  // The column Up next and Popular sit in: the left 7/12 in landscape.
  const booksWidth = sizeClass === 'wide' ? ((contentWidth - SPLIT_GAP) * 7) / 12 : contentWidth;
  let variant = 'phone';
  if (sizeClass === 'wide') {
    variant = 'landscape';
  } else if (sizeClass === 'regular') {
    variant = 'portrait';
  }

  let hero = null;
  if (sections.hero) {
    hero = (
      <ContinueHero
        hero={sections.hero}
        onContinue={() => openReader(sections.hero.book, sections.hero.room?.id)}
      />
    );
  } else if (ready && roomAwaitingBook) {
    hero = <RoomNudgeHero bare room={roomAwaitingBook} username={username} onOpenRoom={openRoom} />;
  } else if (showSkeleton) {
    hero = <HomeSkeleton bare />;
  }

  const slots = {
    hero,
    yourWeek: sections.yourWeek ? <YourWeek week={sections.yourWeek} /> : null,
    roomsTonight: (
      <RoomsTonight
        items={sections.roomsTonight}
        ready={ready}
        stacked={isLarge}
        gutter={gutter}
        onOpenRoom={openRoom}
        onStartRoom={startRoomBook}
        onAllRooms={() => navigation.navigate('Rooms')}
        onJoinByCode={joinByCode}
      />
    ),
    // A reader with no rooms has no room conversation to show.
    newInRooms: hasRooms && sections.newInRooms ? (
      <NewInRooms
        section={sections.newInRooms}
        split={sizeClass === 'regular'}
        onSeeAll={openRoom}
      />
    ) : null,
    upNext: (
      <UpNext
        books={sections.upNext}
        variant={variant}
        width={booksWidth}
        gutter={gutter}
        onOpenBook={(book) => openReader(book, book.roomId)}
        onMyBooks={() => navigation.navigate('MyBooks')}
      />
    ),
    popular: (
      <PopularThisWeek
        variant={variant}
        width={booksWidth}
        gutter={gutter}
        onOpenBook={(book) => navigation.navigate('BookDetail', { book })}
        onSeeAll={() => navigation.navigate('BookGrid', { source: 'popular' })}
      />
    ),
  };

  let layout = <HomePhone {...slots} />;
  if (sizeClass === 'wide') {
    layout = <HomeLandscape {...slots} />;
  } else if (sizeClass === 'regular') {
    layout = <HomePortrait {...slots} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      {header}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.body, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {layout}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  safeTop: {
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },
  body: {
    paddingTop: 18,
    paddingBottom: 32,
  },
  firstRunJoin: {
    paddingHorizontal: PHONE_GUTTER,
    marginTop: 24,
  },
});

export default Home;
