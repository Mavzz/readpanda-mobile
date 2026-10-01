import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import enhancedStorage from '../../utils/enhancedStorage';
import useReadingProgressStore from '../../stores/readingProgressStore';
import useRoomStore from '../../stores/roomStore';

const isFinished = (book) => book.started && book.progressPct >= 100;

// Profile's reading life (7a), all derived from what the device already
// knows: the shelf of stored positions, the reading days behind the widget's
// streak, and the rooms list.
const useProfileData = () => {
  const shelf = useReadingProgressStore((s) => s.shelf);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);
  const rooms = useRoomStore((s) => s.rooms);
  const roomsLoaded = useRoomStore((s) => s.roomsLoaded);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);
  const [streak, setStreak] = useState(() => enhancedStorage.getReadingStreak());

  // Re-read on every look: coming back from the reader may have finished a
  // book or extended the streak.
  useFocusEffect(
    useCallback(() => {
      loadShelf();
      setStreak(enhancedStorage.getReadingStreak());
      if (!roomsLoaded) {
        fetchRooms();
      }
    }, [loadShelf, roomsLoaded, fetchRooms]),
  );

  const year = new Date().getFullYear();

  const stats = useMemo(() => {
    const finished = shelf.filter(isFinished);
    return {
      // Any stored position at all — a book opened, even if not a page read.
      hasProgress: shelf.length > 0,
      finishedCount: finished.length,
      readingCount: shelf.filter((b) => b.started && !isFinished(b)).length,
      // Shelf is most-recent first; a book's last read is when it was finished.
      finishedThisYear: finished.filter(
        (b) => b.lastReadAt && new Date(b.lastReadAt).getFullYear() === year,
      ),
    };
  }, [shelf, year]);

  return { ...stats, streak, rooms, year };
};

export default useProfileData;
