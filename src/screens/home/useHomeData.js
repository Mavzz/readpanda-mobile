import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import log from '../../utils/logger';
import { showToast } from '../../components/Toaster';
import useBucketsStore from '../../stores/bucketsStore';
import useRoomStore from '../../stores/roomStore';
import useReadingProgressStore from '../../stores/readingProgressStore';
import useCommentsStore from '../../stores/commentsStore';
import useNotificationStore from '../../stores/notificationStore';

// Everything Home fetches: the first load after sign-in, the re-read on every
// focus, and pull-to-refresh. Sections read the results from their stores.
const useHomeData = ({ user, navigation }) => {
  const refreshing = useBucketsStore((s) => s.refreshing);
  const fetchCuratedBuckets = useBucketsStore((s) => s.fetchCuratedBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const fetchRooms = useRoomStore((s) => s.fetchRooms);
  const loadActiveBook = useReadingProgressStore((s) => s.loadActiveBook);
  const refreshMemberProgress = useReadingProgressStore((s) => s.refreshMemberProgress);
  const syncFromServer = useReadingProgressStore((s) => s.syncFromServer);
  const loadComments = useCommentsStore((s) => s.loadComments);
  const refreshUnreadCount = useNotificationStore((s) => s.refreshUnreadCount);

  const didInit = useRef(false);
  const welcomeTimer = useRef(null);

  useEffect(() => () => clearTimeout(welcomeTimer.current), []);

  const loadHome = useCallback(async (showRefresh = false) => {
    // Independent of each other, so they go out together.
    const [{ status: curatedStatus }, { status: customStatus }, { status: roomsStatus }] = await Promise.all([
      fetchCuratedBuckets(showRefresh),
      fetchCustomBuckets(),
      fetchRooms(),
    ]);
    // After the rooms, so a book started on another device comes back tagged
    // with the room reading it.
    await syncFromServer(useRoomStore.getState().rooms);
    // The bell's badge — otherwise it only updated once the inbox was opened.
    refreshUnreadCount();
    loadActiveBook();
    // After loadActiveBook, so the hero's room is known before we ask where
    // its members are.
    refreshMemberProgress();
    // Read the hero back out of the store rather than the closure —
    // loadActiveBook() ran a line ago, so the rendered value is stale. Solo
    // books have no room and so no conversation to load.
    const hero = useReadingProgressStore.getState().activeBook;
    if (hero?.roomId) {
      loadComments(hero.roomId, hero.id);
    }
    if (showRefresh && curatedStatus === 200 && customStatus === 200) {
      showToast('Refreshed! 📚', 'success');
    } else if (curatedStatus !== 200 && curatedStatus !== null && roomsStatus !== 200) {
      showToast('Connection error. Please try again.', 'error');
    }
  }, [
    fetchCuratedBuckets,
    fetchCustomBuckets,
    fetchRooms,
    syncFromServer,
    refreshUnreadCount,
    loadActiveBook,
    refreshMemberProgress,
    loadComments,
  ]);

  useEffect(() => {
    if (!user || didInit.current) {
      log.info('No user found or already initialized, skipping home load');
      return;
    }

    // Reading the last-read position out of storage is synchronous, so do it
    // before any await: it decides between the 1a hero and the 3a first run,
    // and waiting on the network first would flash the wrong one.
    loadActiveBook();

    const username = user.username || 'Reader';
    welcomeTimer.current = setTimeout(() => {
      showToast(`Welcome back, ${username}! 👋`, 'success', 4000);
    }, 500);

    if (user.isNewUser) {
      log.info('Navigating new user to InterestScreen');
      navigation.navigate('Interest');
    }
    loadHome();
    didInit.current = true;
  }, [user, navigation, loadActiveBook, loadHome]);

  // Home stays mounted, so without this the hero would keep showing whatever
  // was true when the tab first mounted — a book started from a room, or one
  // just read, wouldn't appear until a pull-to-refresh or an app restart.
  // Cheap: once activeBook is set, this only rebuilds the shelf from MMKV.
  useFocusEffect(
    useCallback(() => {
      loadActiveBook();
      // The pace track is other people's live position, so unlike the hero it
      // is worth re-asking for on every look, not just the first.
      refreshMemberProgress();
    }, [loadActiveBook, refreshMemberProgress]),
  );

  const onRefresh = useCallback(() => {
    loadHome(true);
  }, [loadHome]);

  return { refreshing, onRefresh };
};

export default useHomeData;
