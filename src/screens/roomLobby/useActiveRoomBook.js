import { useEffect, useMemo } from 'react';
import useReadingProgressStore, { roomMembersOf, roomMemberProgress } from '../../stores/readingProgressStore';
import useCommentsStore from '../../stores/commentsStore';
import { bookIdOf, sameId } from '../../utils/bookId';

// This room's book as the active Room's sections render it (2c / 14i): the
// reader's own place from their stored position (any room — a position is the
// book's, not the room's), and everyone's pace from *this* room's members.
// The shelf can't be used as is: a member who hasn't opened the book has no
// shelf row, and a book read in two rooms has one row naming the other room.
const useActiveRoomBook = (room) => {
  const currentBook = room?.currentBook;
  const bookId = currentBook ? bookIdOf(currentBook) : room?.currentBookId;

  const shelfEntry = useReadingProgressStore((s) => s.shelf.find((b) => sameId(b.id, bookId)));
  const remote = useReadingProgressStore((s) => s.remoteProgress?.[bookId]);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);
  const fetchMemberProgress = useReadingProgressStore((s) => s.fetchMemberProgress);
  const loadComments = useCommentsStore((s) => s.loadComments);

  useEffect(() => {
    loadShelf();
  }, [loadShelf]);

  useEffect(() => {
    if (room?.id && bookId) {
      fetchMemberProgress(room.id);
      loadComments(room.id, bookId);
    }
  }, [room?.id, bookId, fetchMemberProgress, loadComments]);

  return useMemo(() => {
    if (!bookId) {
      return null;
    }
    const mine = shelfEntry || {
      id: bookId,
      title: currentBook?.title || room?.currentBookTitle || '',
      coverUrl: currentBook?.cover_image_url || room?.coverUrl || null,
      manuscriptUrl: currentBook?.manuscript_url || null,
      unit: 'page',
      chapter: 1,
      totalChapters: 0,
      progressPct: 0,
      started: false,
    };
    return {
      ...mine,
      roomId: room.id,
      roomName: room.name,
      memberProgress: roomMemberProgress(roomMembersOf(room), mine.progressPct, remote),
    };
  }, [bookId, shelfEntry, currentBook, room, remote]);
};

export default useActiveRoomBook;
