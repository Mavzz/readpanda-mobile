import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { showToast } from '../../components/Toaster';
import PickerSheet from '../../components/PickerSheet';
import useRoomStore from '../../stores/roomStore';
import useBooksStore from '../../stores/booksStore';
import useBucketsStore from '../../stores/bucketsStore';
import useReadingProgressStore from '../../stores/readingProgressStore';
import lobbyStyles from './lobbyStyles';
import { bookIdOf, toPickerBook } from './roomLobbyFormat';
import NoBookCard from './NoBookCard';
import RoomBookCard from './RoomBookCard';

// "First, decide what to read": the room's book (or bucket), how far in the
// reader is, and the pickers that change it. A room reads either a standalone
// book or a bucket (a shared list) with a current book picked from it.
const BookSection = ({ room, members, bucket, currentBook, bookTitle, iAmCreator, onOpenBook }) => {
  const [picker, setPicker] = useState(null); // 'book' | 'bucket' | 'bucket-book'
  const [pendingBucket, setPendingBucket] = useState(null);

  const setRoomReading = useRoomStore((s) => s.setRoomReading);
  const books = useBooksStore((s) => s.books);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);
  const startBook = useReadingProgressStore((s) => s.startBook);
  const loadProgress = useReadingProgressStore((s) => s.loadProgress);
  // Subscribed, not just read once: coming back from the reader has to move
  // the room's progress bar without a remount.
  const progressMap = useReadingProgressStore((s) => s.progress);

  const upNext = (bucket?.books || []).filter((b) => bookIdOf(b) !== bookIdOf(currentBook));

  // How far into the room's book the reader actually is. There is no
  // per-member progress endpoint yet, so what the room can honestly show is
  // this reader's own position — groupProgressPct takes over the moment the
  // API starts returning it.
  const roomBookId = bookIdOf(currentBook) || room?.currentBookId || null;
  const roomProgress = (roomBookId && progressMap[roomBookId])
    || (roomBookId ? loadProgress(roomBookId) : null);
  const pagesRead = roomProgress?.currentPage || 0;
  const roomTotalPages = roomProgress?.totalPages || 0;
  const startedInRoom = roomTotalPages > 0;
  const myPct = startedInRoom ? Math.round(((pagesRead + 1) / roomTotalPages) * 100) : 0;
  const shownPct = room?.groupProgressPct > 0 ? room.groupProgressPct : myPct;
  const progressLabel = room?.groupProgressPct > 0
    ? `${room.groupProgressPct}% through · together`
    : startedInRoom
      ? `Page ${pagesRead + 1} of ${roomTotalPages} · ${myPct}% · your progress`
      : 'Not started yet';

  // Once reading has begun the room is committed. Swapping the book out from
  // under people would strand everyone's progress and comments on a book the
  // room is no longer reading, so the choice is made once.
  const bookLocked = startedInRoom;
  const refuseChange = () => showToast(
    'Reading has started — this book is locked for the room',
    'info',
  );

  // The room's book is where reading actually begins: make it the active book
  // (so the Home hero and Reading tab pick it up, tagged with this room) and
  // open the reader. Without this the room's choice was a dead end — see the
  // reading-journey audit.
  const startReadingRoomBook = () => {
    const book = currentBook || (room?.currentBookId
      ? {
        book_id: room.currentBookId,
        title: bookTitle,
        cover_image_url: room.coverUrl,
      }
      : null);

    const stored = book && startBook(book, {
      // The id is what lets deleting or leaving this room find the book again.
      roomId: room?.id,
      roomName: room?.name,
      // Real members, so the Reading tab's pace card shows this room's people
      // rather than the 1b demo fixture.
      roomMembers: members.map((m) => ({
        userId: m.id,
        initials: m.initials,
        isMe: m.isSelf,
      })),
    });
    if (!stored) {
      showToast('Could not open that book', 'error');
      return;
    }

    onOpenBook(stored);
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
    if (bookLocked) {
      refuseChange();
      return;
    }
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
    if (bookLocked) {
      refuseChange();
      return;
    }
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
    if (bookLocked) {
      refuseChange();
      return;
    }
    applyReading({ bucket, currentBook: book }, `Now reading ${book.title}`);
  };

  const openBucketPicker = () => {
    setPendingBucket(null);
    setPicker('bucket');
  };

  // Members can't change the book, so the creator's setup-flow wording
  // ("First, decide…") would be addressed to the wrong person.
  const creatorName = members.find((m) => m.isCreator)?.name?.split(' ')[0] || 'The creator';

  const bucketPickerItems = [...customBuckets, ...curatedBuckets].map((b) => ({
    id: b.id,
    title: b.name,
    subtitle: `${b.bookCount || 0} ${b.bookCount === 1 ? 'book' : 'books'}`,
    isBucket: true,
  }));

  return (
    <>
      <Text style={[lobbyStyles.eyebrow, styles.firstSection]}>
        {iAmCreator ? 'First, decide what to read' : 'Reading'}
      </Text>
      {bookTitle ? (
        <RoomBookCard
          coverUrl={currentBook?.cover_image_url || room?.coverUrl}
          bookTitle={bookTitle}
          bucket={bucket}
          upNext={upNext}
          shownPct={shownPct}
          progressLabel={progressLabel}
          bookLocked={bookLocked}
          canEdit={iAmCreator}
          onStartReading={startReadingRoomBook}
          onSwapBook={handleSwapCurrentBook}
          onAddBucket={openBucketPicker}
        />
      ) : iAmCreator ? (
        <NoBookCard onChooseBook={() => setPicker('book')} onChooseBucket={openBucketPicker} />
      ) : (
        <NoBookCard pickerName={creatorName} />
      )}

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
    </>
  );
};

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 24,
  },
});

export default BookSection;
