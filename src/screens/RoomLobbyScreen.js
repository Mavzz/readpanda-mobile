import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  Modal,
  Alert,
  Clipboard,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { DS } from '../styles/global';
import { showToast } from '../components/Toaster';
import GradientPill from '../components/GradientPill';
import BookCoverGradient from '../components/BookCoverGradient';
import PickerSheet from '../components/PickerSheet';
import getInitials from '../utils/getInitials';
import { useAuth } from '../contexts/AuthContext';
import useRoomStore from '../stores/roomStore';
import useBooksStore from '../stores/booksStore';
import useBucketsStore from '../stores/bucketsStore';
import log from '../utils/logger';

// Room Detail (ROOM_DETAIL_2a-2.md): an ordered setup flow — decide what to
// read, bring your people — not a fact sheet. A room reads either a standalone
// book or a bucket (a shared list) with a current book picked from it.
// The ABOUT section and the bordered invite-code card are intentionally gone.

// Book records reach us in two shapes: the manuscripts list uses `id`, a
// bucket's books_preview uses `book_id`.
const bookIdOf = (book) => book?.book_id ?? book?.id;

const toPickerBook = (book) => ({
  id: bookIdOf(book),
  title: book?.title || 'Untitled',
  subtitle: book?.author_name || null,
  coverUrl: book?.cover_image_url || null,
});

const formatJoinDate = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// "Just created" until the room is a day old, then the date it was made.
const roomAgeLabel = (createdAt) => {
  const date = createdAt ? new Date(createdAt) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Just created';
  }
  const hoursOld = (Date.now() - date.getTime()) / (1000 * 60 * 60);
  return hoursOld < 24 ? 'Just created' : `Created ${formatJoinDate(createdAt)}`;
};

const RoomLobbyScreen = ({ navigation, route }) => {
  const routeRoom = route?.params?.room ?? null;
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [picker, setPicker] = useState(null); // 'book' | 'bucket' | 'bucket-book'
  const [pendingBucket, setPendingBucket] = useState(null);
  const [qrVisible, setQrVisible] = useState(false);

  // Read the live room out of the store so a reading choice re-renders here;
  // fall back to the route snapshot for rooms not in the list.
  const storedRoom = useRoomStore((s) => s.rooms.find((r) => r.id === routeRoom?.id));
  const room = storedRoom || routeRoom;
  const setRoomReading = useRoomStore((s) => s.setRoomReading);
  const fetchRoomDetail = useRoomStore((s) => s.fetchRoomDetail);
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  const books = useBooksStore((s) => s.books);
  const fetchBooks = useBooksStore((s) => s.fetchBooks);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const fetchCuratedBuckets = useBucketsStore((s) => s.fetchCuratedBuckets);

  const selfName = user?.username || 'You';
  const inviteCode = room?.inviteCode || room?.invite_code || null;
  const bucket = room?.bucket || null;
  const currentBook = room?.currentBook || null;
  const bookTitle = currentBook?.title || room?.currentBookTitle || null;
  const bucketBooks = bucket?.books || [];
  const upNext = bucketBooks.filter((b) => bookIdOf(b) !== bookIdOf(currentBook));

  useEffect(() => {
    // GET /room/{id} brings the real members, current book and bucket.
    // Fixture rooms (ids prefixed "fixture-") have no server record.
    if (routeRoom?.id && !String(routeRoom.id).startsWith('fixture-')) {
      fetchRoomDetail(routeRoom.id);
    }
    // The pickers read from these stores; make sure they're populated.
    fetchBooks();
    fetchCustomBuckets();
    fetchCuratedBuckets();
  }, [routeRoom?.id]);

  // Members come from GET /room/{id}. We identify "me" by username, since the
  // client doesn't hold its own user id. Self sorts first; the API already
  // returns the creator first otherwise.
  const apiMembers = (room?.members || []).map((m, i) => {
    const name = m.name || m.username || m.initials || 'Member';
    return {
      id: m.userId || m.user_id || `member-${i}`,
      name,
      initials: m.initials || getInitials(name),
      isSelf: m.isMe || name === selfName,
      isCreator: !!m.isCreator,
      joinedAt: m.joinedAt || m.joined_at || null,
    };
  });

  const iAmCreator = apiMembers.length > 0
    ? apiMembers.some((m) => m.isSelf && m.isCreator)
    // Before detail loads (or for a fixture room) assume the viewer's own room.
    : true;

  const members = apiMembers.length > 0
    ? [...apiMembers].sort((a, b) => Number(b.isSelf) - Number(a.isSelf))
    // Before the detail call resolves (or for a fixture room) the one member
    // we can always name is the person looking at the screen.
    : [{ id: 'self', name: selfName, initials: getInitials(selfName), isSelf: true, isCreator: true }];

  const handleCopyCode = () => {
    if (!inviteCode) {
      return;
    }
    Clipboard.setString(inviteCode);
    setCopied(true);
    showToast('Invite code copied', 'success', 2000);
    setTimeout(() => setCopied(false), 2000);
    log.info('Invite code copied:', inviteCode);
  };

  const handleShareInvite = async () => {
    if (!inviteCode) {
      return;
    }
    try {
      await Share.share({
        message: `Join "${room?.name}" on ReadPanda — invite code: ${inviteCode}`,
      });
    } catch (error) {
      log.error('Failed to share invite:', error);
    }
  };

  const applyReading = async ({ bucket: nextBucket, currentBook: nextBook }, successText) => {
    setPicker(null);
    const { status, error } = await setRoomReading(room.id, {
      bucket: nextBucket,
      currentBook: nextBook,
    });
    showToast(status === 200 ? successText : (error || 'Could not update the room'),
      status === 200 ? 'success' : 'error');
  };

  const handlePickBook = (item) => {
    const picked = books.find((b) => bookIdOf(b) === item.id) || item;
    applyReading({ bucket: null, currentBook: picked }, `Now reading ${item.title}`);
  };

  const handlePickBucket = (item) => {
    const source = [...customBuckets, ...curatedBuckets].find((b) => b.id === item.id);
    const bucketBooksPreview = source?.booksPreview || [];
    // Picking a bucket sets room.bucket, then immediately asks which book first.
    setPendingBucket({
      id: source?.id,
      name: source?.name,
      // The API needs to know which table the bucket lives in.
      type: source?.isCurated ? 'curated' : 'user',
      bookIds: bucketBooksPreview.map(bookIdOf),
      books: bucketBooksPreview,
    });
    setPicker('bucket-book');
  };

  const handlePickBucketBook = (item) => {
    const picked = (pendingBucket?.books || []).find((b) => bookIdOf(b) === item.id) || item;
    const nextBucket = pendingBucket || bucket;
    setPendingBucket(null);
    applyReading(
      { bucket: nextBucket, currentBook: picked },
      `Reading ${item.title} from ${nextBucket?.name}`,
    );
  };

  // "Finish book → choose next": creator swaps the current book for another
  // one from the bucket (kept simple — no vote).
  const handleSwapCurrentBook = (book) => {
    applyReading({ bucket, currentBook: book }, `Now reading ${book.title}`);
  };

  // Deleting a room takes everyone's membership with it, so confirm first.
  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete room?',
      `"${room?.name}" and everyone's place in it will be removed. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { status, error } = await deleteRoom(room.id);
            if (status === 204) {
              showToast('Room deleted', 'success');
              navigation.goBack();
            } else {
              showToast(error || 'Could not delete the room', 'error');
            }
          },
        },
      ],
    );
  };

  const handleLeaveRoom = () => {
    Alert.alert(
      'Leave room?',
      `You'll stop seeing "${room?.name}". You can rejoin with the invite code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { status, error } = await leaveRoom(room.id);
            if (status === 204) {
              showToast('You left the room', 'success');
              navigation.goBack();
            } else {
              showToast(error || 'Could not leave the room', 'error');
            }
          },
        },
      ],
    );
  };

  const openBucketPicker = () => {
    setPendingBucket(null);
    setPicker('bucket');
  };

  const bucketPickerItems = [...customBuckets, ...curatedBuckets].map((b) => ({
    id: b.id,
    title: b.name,
    subtitle: `${b.bookCount || 0} ${b.bookCount === 1 ? 'book' : 'books'}`,
    isBucket: true,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.roomName} numberOfLines={1}>{room?.name ?? 'Room'}</Text>
            <Text style={styles.roomSubtitle} numberOfLines={1}>
              {bookTitle || roomAgeLabel(room?.createdAt)} · {members.length}{' '}
              {members.length === 1 ? 'member' : 'members'}
              {bucket?.name ? ` · from ${bucket.name}` : ''}
            </Text>
          </View>
        </View>

        {/* ── First, pick the book ────────────────────────────── */}
        <Text style={[styles.eyebrow, styles.firstSection]}>First, decide what to read</Text>
        {bookTitle ? (
          <>
            {/* STATE B / C — the cover-led progress hero from § 1b */}
            <View style={styles.bookHero}>
              <BookCoverGradient
                coverUrl={currentBook?.cover_image_url || room?.coverUrl}
                title={bookTitle}
                width={72}
                height={100}
                borderRadius={14}
                titleFontSize={10}
              />
              <View style={styles.bookHeroText}>
                <Text style={styles.bookHeroTitle} numberOfLines={2}>{bookTitle}</Text>
                <Text style={styles.bookHeroMeta}>
                  {room?.groupProgressPct > 0
                    ? `${room.groupProgressPct}% through · together`
                    : 'Not started yet'}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${room?.groupProgressPct || 0}%` }]} />
                </View>
              </View>
            </View>

            {bucket ? (
              /* STATE B — reading through a bucket: what's queued after this */
              upNext.length > 0 && (
                <View style={styles.upNext}>
                  <Text style={styles.upNextEyebrow} numberOfLines={1}>
                    Up next in {bucket.name}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.upNextRow}
                  >
                    {upNext.map((book) => (
                      <Pressable
                        key={bookIdOf(book)}
                        onPress={() => handleSwapCurrentBook(book)}
                        style={({ pressed }) => pressed && styles.pressed}
                        accessibilityLabel={`Read ${book.title} next`}
                        accessibilityRole="button"
                      >
                        <BookCoverGradient
                          coverUrl={book.cover_image_url}
                          title={book.title}
                          width={44}
                          height={62}
                          borderRadius={10}
                          titleFontSize={7}
                        />
                      </Pressable>
                    ))}
                    <View style={styles.upNextChip}>
                      <Text style={styles.upNextChipText}>{upNext.length} left</Text>
                    </View>
                  </ScrollView>
                </View>
              )
            ) : (
              /* STATE C — standalone book: let the room graduate to a list */
              <Pressable
                onPress={openBucketPicker}
                style={({ pressed }) => [styles.addBucket, pressed && styles.pressed]}
              >
                <Text style={styles.addBucketText}>Add a bucket</Text>
              </Pressable>
            )}
          </>
        ) : (
          /* STATE A — nothing chosen yet */
          <>
            <View style={styles.bookCard}>
              <View style={styles.coverPlaceholder}>
                <Icon name="book-outline" size={24} color={DS.colors.onSurfaceVariant} />
              </View>
              <View style={styles.bookCardText}>
                <Text style={styles.bookCardTitle}>Nothing on the shelf yet</Text>
                <Text style={styles.bookCardBody}>
                  Pick one book — or a bucket, a whole reading list to work through together.
                </Text>
              </View>
            </View>
            <GradientPill onPress={() => setPicker('book')} style={styles.bookCta}>
              <Icon name="search" size={17} color={DS.colors.onPrimary} />
              <Text style={styles.bookCtaText}>Choose a book</Text>
            </GradientPill>
            <Pressable
              onPress={openBucketPicker}
              style={({ pressed }) => [styles.bucketCta, pressed && styles.pressed]}
            >
              <Icon name="albums-outline" size={16} color={DS.colors.primary} />
              <Text style={styles.bucketCtaText}>Read through a bucket</Text>
            </Pressable>
          </>
        )}

        {/* ── Then, bring your people ─────────────────────────── */}
        <Text style={styles.eyebrow}>Then, bring your people</Text>
        <View style={styles.inviteCard}>
          <View style={styles.codeWell}>
            <Text style={styles.codeText}>{(inviteCode || '------').toUpperCase()}</Text>
            <Pressable
              onPress={handleCopyCode}
              style={({ pressed }) => [styles.copyControl, pressed && styles.pressed]}
              accessibilityLabel="Copy invite code"
              accessibilityRole="button"
            >
              <Icon
                name={copied ? 'checkmark' : 'copy-outline'}
                size={16}
                color={DS.colors.onSurfaceVariant}
              />
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleShareInvite}
              style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}
            >
              <Icon name="share-outline" size={15} color={DS.colors.primary} />
              <Text style={styles.actionPillText}>Share invite</Text>
            </Pressable>
            <Pressable
              onPress={() => setQrVisible(true)}
              style={({ pressed }) => [styles.actionPill, pressed && styles.pressed]}
            >
              <Icon name="qr-code-outline" size={15} color={DS.colors.primary} />
              <Text style={styles.actionPillText}>QR code</Text>
            </Pressable>
          </View>

          <Text style={styles.inviteCaption}>Anyone with the code can join this room</Text>
        </View>

        {/* ── Members ─────────────────────────────────────────── */}
        <Text style={styles.eyebrow}>Members · {members.length}</Text>
        <View style={styles.memberList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={[styles.memberAvatar, member.isSelf && styles.memberAvatarSelf]}>
                <Text style={[styles.memberInitials, member.isSelf && styles.memberInitialsSelf]}>
                  {member.initials}
                </Text>
              </View>
              <View style={styles.memberText}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.name}
                  {member.isSelf ? <Text style={styles.memberYou}> (you)</Text> : null}
                </Text>
                <Text style={styles.memberRole}>
                  {member.isCreator
                    ? 'Room creator'
                    : member.joinedAt
                      ? `Joined ${formatJoinDate(member.joinedAt)}`
                      : 'Member'}
                </Text>
              </View>
            </View>
          ))}

          {members.length < 2 && (
            <View style={styles.waitingRow}>
              <View style={styles.waitingIcon}>
                <Icon name="person-add-outline" size={15} color={DS.colors.onSurfaceVariant} />
              </View>
              <Text style={styles.waitingText}>
                Waiting for friends — share the code above and they&apos;ll appear here.
              </Text>
            </View>
          )}
        </View>

        {/* ── Leave / delete ──────────────────────────────────── */}
        <Pressable
          onPress={iAmCreator ? handleDeleteRoom : handleLeaveRoom}
          style={({ pressed }) => [styles.dangerAction, pressed && styles.pressed]}
        >
          <Icon
            name={iAmCreator ? 'trash-outline' : 'exit-outline'}
            size={16}
            color={DS.colors.error}
          />
          <Text style={styles.dangerActionText}>
            {iAmCreator ? 'Delete room' : 'Leave room'}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={qrVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQrVisible(false)}
      >
        <Pressable style={styles.qrBackdrop} onPress={() => setQrVisible(false)}>
          <Pressable style={styles.qrCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.qrTitle}>Scan to join</Text>
            <Text style={styles.qrRoom} numberOfLines={1}>{room?.name}</Text>
            <View style={styles.qrCanvas}>
              {inviteCode ? (
                <QRCode
                  value={`readpanda://join/${inviteCode}`}
                  size={196}
                  color={DS.colors.surfaceContainerLowest}
                  backgroundColor={DS.colors.onSurface}
                />
              ) : null}
            </View>
            <Text style={styles.qrCode}>{(inviteCode || '------').toUpperCase()}</Text>
            <Text style={styles.qrCaption}>
              Point a camera at this, or share the code above.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      <PickerSheet
        visible={picker === 'book'}
        title="Choose a book"
        subtitle="Everyone in the room reads this one"
        items={books.map(toPickerBook)}
        onSelect={handlePickBook}
        onClose={() => setPicker(null)}
        emptyText="No books available yet."
      />
      <PickerSheet
        visible={picker === 'bucket'}
        title="Read through a bucket"
        subtitle="A whole reading list to work through together"
        items={bucketPickerItems}
        onSelect={handlePickBucket}
        onClose={() => setPicker(null)}
        emptyText="You don't have any buckets yet."
      />
      <PickerSheet
        visible={picker === 'bucket-book'}
        title="Which book first?"
        subtitle={pendingBucket?.name ? `From ${pendingBucket.name}` : null}
        items={(pendingBucket?.books || []).map(toPickerBook)}
        onSelect={handlePickBucketBook}
        onClose={() => {
          setPicker(null);
          setPendingBucket(null);
        }}
        emptyText="This bucket has no books yet."
      />
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  roomName: {
    fontSize: 24,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
  },
  roomSubtitle: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Section eyebrows
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 28,
  },
  firstSection: {
    marginTop: 24,
  },

  // Book — empty state
  bookCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 18,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  coverPlaceholder: {
    width: 56,
    height: 78,
    borderRadius: 12,
    backgroundColor: DS.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCardText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  bookCardTitle: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginBottom: 4,
  },
  bookCardBody: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  bookCta: {
    marginTop: 12,
    gap: 8,
  },
  bookCtaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  bucketCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    padding: 13,
    marginTop: 10,
  },
  bucketCtaText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Up next (bucket queue)
  upNext: {
    marginTop: 16,
  },
  upNextEyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  upNextChip: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  upNextChipText: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },

  // Standalone book — graduate to a reading list
  addBucket: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addBucketText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Book — set (cover-led hero, per § 1b)
  bookHero: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 18,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  bookHeroText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  bookHeroTitle: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  bookHeroMeta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },

  // Invite
  inviteCard: {
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 20,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  codeWell: {
    backgroundColor: DS.colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 24,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
    letterSpacing: 6,
  },
  copyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    padding: 12,
  },
  actionPillText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  qrBackdrop: {
    flex: 1,
    backgroundColor: DS.colors.surfaceContainerLowest + 'D9', // ~85%
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  qrCard: {
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 24,
    alignItems: 'center',
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  qrRoom: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 18,
  },
  qrCanvas: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: DS.colors.onSurface,
  },
  qrCode: {
    fontSize: 20,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
    letterSpacing: 6,
    marginTop: 18,
  },
  qrCaption: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 220,
  },
  inviteCaption: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
  },

  // Members
  memberList: {
    gap: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.comment,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarSelf: {
    backgroundColor: DS.colors.primary,
  },
  memberInitials: {
    fontSize: 12,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  memberInitialsSelf: {
    color: DS.colors.onPrimary,
  },
  memberText: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  memberYou: {
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  memberRole: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.comment,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  waitingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLow,
  },
  dangerActionText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.error,
  },
  waitingText: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
});

export default RoomLobbyScreen;
