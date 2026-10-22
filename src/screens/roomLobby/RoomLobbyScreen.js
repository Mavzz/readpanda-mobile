import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DS } from '../../styles/global';
import useRoomLobby from './useRoomLobby';
import LobbyHeader from './LobbyHeader';
import BookSection from './BookSection';
import InviteSection from './InviteSection';
import WhoCanJoin from './WhoCanJoin';
import MemberList from './MemberList';
import DangerZone from './DangerZone';
import ReadableColumn from '../../components/ReadableColumn';
import SplitLayout from '../../components/SplitLayout';
import useLayout from '../../hooks/useLayout';
import ActiveRoomHeader from './ActiveRoomHeader';
import YourPlaceCard from './YourPlaceCard';
import WhereEveryoneIs from './WhereEveryoneIs';
import RecentComments from './RecentComments';
import useActiveRoomBook from './useActiveRoomBook';

// Room Detail. Until the room has a book it's the setup flow (2a,
// ROOM_DETAIL_2a-2.md): decide what to read, bring your people. Once it has
// one it's the active Room (2c / 14i): your place, where everyone is, and what's
// been said. The schedule card joins it when room schedules ship (turn 18,
// on hold). Leave / Delete stay at the bottom in both.
const RoomLobbyScreen = ({ navigation, route }) => {
  const {
    room,
    members,
    iAmCreator,
    inviteCode,
    bucket,
    currentBook,
    bookTitle,
  } = useRoomLobby(route?.params?.room ?? null);
  const { sizeClass, isLarge, pagePad } = useLayout();
  const roomBook = useActiveRoomBook(room);
  const dangerZone = (
    <DangerZone room={room} iAmCreator={iAmCreator} onGone={() => navigation.goBack()} />
  );

  if (roomBook) {
    // The invite card (code, Copy, Share, QR) as in the setup state, rather
    // than 2c's header icon — decided after device review.
    const invite = (
      <>
        <InviteSection roomName={room?.name} inviteCode={inviteCode} iAmCreator={false} isPrivate={room?.isPrivate} />
        <WhoCanJoin room={room} iAmCreator={iAmCreator} />
      </>
    );
    const place = <YourPlaceCard book={roomBook} />;
    const everyone = <WhereEveryoneIs book={roomBook} />;
    let body;
    if (sizeClass === 'wide') {
      // 14i: your place and the room on the left, comments on the right.
      body = (
        <SplitLayout
          ratio={[3, 2]}
          left={<View style={styles.stack}>{place}{everyone}{dangerZone}</View>}
          right={<View style={styles.stack}><RecentComments book={roomBook} limit={6} />{invite}</View>}
        />
      );
    } else {
      // 2c, and 14i in portrait: one column, comments under the rest.
      body = (
        <View style={styles.stack}>
          {place}
          {everyone}
          <RecentComments book={roomBook} />
          {invite}
          {dangerZone}
        </View>
      );
    }
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <ScrollView
          contentContainerStyle={[styles.content, isLarge && { paddingHorizontal: pagePad }]}
          showsVerticalScrollIndicator={false}
        >
          <ActiveRoomHeader
            room={room}
            bookTitle={bookTitle}
            memberCount={members.length}
            onBack={() => navigation.goBack()}
          />
          <View style={styles.activeBody}>
            {sizeClass === 'regular' ? <ReadableColumn>{body}</ReadableColumn> : body}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 15k: on iPad landscape the two setup jobs sit side by side, the book on
  // the left and your people on the right; the portrait layout stacks them in
  // a readable column. The phone stacks them as before.
  const sections = (
    <SplitLayout
      ratio={[3, 2]}
      gap={isLarge ? 28 : 0}
      left={(
        <BookSection
          room={room}
          members={members}
          bucket={bucket}
          currentBook={currentBook}
          bookTitle={bookTitle}
          iAmCreator={iAmCreator}
          onOpenBook={(book) => navigation.navigate('ManuscriptScreen', { book })}
        />
      )}
      right={(
        <View>
          <InviteSection
            roomName={room?.name}
            inviteCode={inviteCode}
            iAmCreator={iAmCreator}
            isPrivate={room?.isPrivate}
          />
          <WhoCanJoin room={room} iAmCreator={iAmCreator} style={styles.whoCanJoin} />
          <MemberList members={members} />
          {dangerZone}
        </View>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <ScrollView
        contentContainerStyle={[styles.content, isLarge && { paddingHorizontal: pagePad }]}
        showsVerticalScrollIndicator={false}
      >
        <LobbyHeader
          room={room}
          bookTitle={bookTitle}
          bucket={bucket}
          memberCount={members.length}
          onBack={() => navigation.goBack()}
        />
        {sizeClass === 'regular' ? <ReadableColumn>{sections}</ReadableColumn> : sections}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  activeBody: {
    marginTop: 16,
  },
  stack: {
    gap: 16,
  },
  whoCanJoin: {
    marginTop: 12,
  },
});

export default RoomLobbyScreen;
