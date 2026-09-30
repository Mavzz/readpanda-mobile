import { View, Text, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import log from '../../utils/logger';
import { DS } from '../../styles/global';
import useAuthStore from '../../stores/authStore';
import useRoomStore from '../../stores/roomStore';
import useReadingProgressStore from '../../stores/readingProgressStore';
import useHomeData from './useHomeData';
import HomeHeader from './HomeHeader';
import ContinueReadingHero from './ContinueReadingHero';
import RoomSwapCard from './RoomSwapCard';
import RoomNudgeHero from './RoomNudgeHero';
import FirstRunHero from './FirstRunHero';
import RoomsTonight from './RoomsTonight';
import CuratedForYou from './CuratedForYou';

const Home = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const rooms = useRoomStore((s) => s.rooms);
  const roomsLoaded = useRoomStore((s) => s.roomsLoaded);
  const activeBook = useReadingProgressStore((s) => s.activeBook);
  const activeBookLoaded = useReadingProgressStore((s) => s.activeBookLoaded);
  const attachRoom = useReadingProgressStore((s) => s.attachRoom);

  const { refreshing, onRefresh } = useHomeData({ user, navigation });

  const username = user?.username || 'Reader';

  // ── First-run state (FIRST_RUN_3a_3b.md § 3a) ──────────────────────────
  // isFirstRun-Home: no activeBook AND no rooms. The two mixed states —
  // a room but no book, a book but no rooms — are handled inline below.
  const ready = activeBookLoaded && roomsLoaded;
  const hasRooms = rooms.length > 0;
  const isFirstRun = ready && !activeBook && !hasRooms;
  // The room whose book still has to be chosen — the hero nudge for a reader
  // who joined a room before picking anything up. Strictly a room with no
  // book: joining one that has already chosen adopts its book (attachRoom), so
  // a room that isn't waiting on anyone must not fall through to a nudge that
  // tells you to pick a book that's already picked.
  const roomAwaitingBook = rooms.find((r) => !r.currentBookTitle);
  // A room reading something other than what's on the nightstand. The hero
  // stays the reader's own — this is offered under it as an explicit swap,
  // never taken automatically.
  const roomWithOtherBook = activeBook
    ? rooms.find((r) => r.currentBookId
      && r.currentBookId !== activeBook.id
      && r.id !== activeBook.roomId)
    : null;

  const handleContinueReading = () => {
    if (!activeBook) {
      return;
    }
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: activeBook.id,
        title: activeBook.title,
        cover_image_url: activeBook.coverUrl,
        manuscript_url: activeBook.manuscriptUrl,
      },
    });
  };

  const openRoom = (room) => {
    navigation.navigate('RoomLobbyScreen', { room });
  };

  // The reader chose to read what their room is reading. `force` because
  // attachRoom deliberately won't displace a book on its own.
  const switchToRoomBook = (room) => {
    log.info('Switching to', room.currentBookTitle, 'with', room.name);
    attachRoom(room, { force: true });
  };

  const openBucket = (bucket) => {
    navigation.navigate('BucketBooksScreen', {
      books_preview: bucket.booksPreview,
      name: bucket.name,
      book_count: bucket.bookCount,
      // Without the id the screen only ever has the 2-book preview.
      bucket_id: bucket.id,
      isCustom: !bucket.isCurated,
    });
  };

  const browseBooks = () => navigation.navigate('LibraryScreen');
  const createRoom = () => navigation.navigate('CreateRoomScreen');
  // Rooms tab with the invite-code field already focused.
  const joinByCode = () => navigation.navigate('Rooms', { focusCode: true });

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <View style={styles.loadingContainer}>
          <Icon name="book" size={48} color={DS.colors.primary} />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <HomeHeader
          username={username}
          showBell={!isFirstRun}
          onOpenProfile={() => navigation.navigate('Profile')}
        />
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      >
        {activeBook && (
          <ContinueReadingHero activeBook={activeBook} onContinue={handleContinueReading} />
        )}
        {ready && roomWithOtherBook && (
          <RoomSwapCard room={roomWithOtherBook} onSwitch={switchToRoomBook} />
        )}
        {ready && !activeBook && hasRooms && roomAwaitingBook && (
          <RoomNudgeHero room={roomAwaitingBook} username={username} onOpenRoom={openRoom} />
        )}
        {isFirstRun && <FirstRunHero onBrowse={browseBooks} onCreateRoom={createRoom} />}

        <RoomsTonight
          rooms={rooms}
          ready={ready}
          onOpenRoom={openRoom}
          onJoinByCode={joinByCode}
        />
        <CuratedForYou isFirstRun={isFirstRun} onOpenBucket={openBucket} onSeeAll={browseBooks} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
  },
});

export default Home;
