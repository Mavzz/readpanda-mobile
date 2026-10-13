import { View, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DS } from '../../styles/global';
import useRoomLobby from './useRoomLobby';
import LobbyHeader from './LobbyHeader';
import BookSection from './BookSection';
import InviteSection from './InviteSection';
import MemberList from './MemberList';
import DangerZone from './DangerZone';
import ReadableColumn from '../../components/ReadableColumn';
import SplitLayout from '../../components/SplitLayout';
import useLayout from '../../hooks/useLayout';

// Room Detail (ROOM_DETAIL_2a-2.md): an ordered setup flow — decide what to
// read, bring your people — not a fact sheet.
// The ABOUT section and the bordered invite-code card are intentionally gone.
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
          <InviteSection roomName={room?.name} inviteCode={inviteCode} iAmCreator={iAmCreator} />
          <MemberList members={members} />
          <DangerZone room={room} iAmCreator={iAmCreator} onGone={() => navigation.goBack()} />
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
});

export default RoomLobbyScreen;
