import { useEffect } from 'react';
import { AppState, Image, NativeModules, Platform } from 'react-native';
import useConnectivityStore from '../stores/connectivityStore';
import useBucketsStore from '../stores/bucketsStore';
import { fetchMyProgress } from '../services/progressService';
import log from '../utils/logger';

// The books on the Reading shelf, downloaded on Wi-Fi before the reader needs
// them offline (specs/offline-first R6): the 10 read most recently, one at a
// time, whenever the app comes to the foreground on Wi-Fi. Every bucket's
// page and covers come first (R6.5, R6.6), so one never opened still opens
// offline.
//
// The manuscript URLs are presigned and expire, so they're asked for fresh
// from GET /progress each time rather than read from stored positions. The
// cache keys on the URL without its query, so a fresh link still finds a book
// already downloaded.

const { ManuscriptStore } = NativeModules;
const SHELF_LIMIT = 10;
const COVER_LIMIT = 200;
// A quick trip to another app and back shouldn't ask the API again.
const MIN_GAP = 10 * 60 * 1000;

const onWifi = () => {
  const { online, wifi, expensive } = useConnectivityStore.getState();
  return online && wifi && !expensive;
};

let running = false;
let lastRun = 0;

// Each bucket's page goes into the store's caches (curatedBooks,
// bucketBooks) as a side effect of fetching it; the covers into the iOS URL
// cache that BookCoverGradient reads offline.
const prefetchBuckets = async () => {
  const buckets = useBucketsStore.getState();
  if (buckets.curatedBuckets.length === 0 && buckets.customBuckets.length === 0) {
    await Promise.all([buckets.fetchCuratedBuckets(), buckets.fetchCustomBuckets()]);
  }
  const { curatedBuckets, customBuckets, fetchCuratedBucketBooks, fetchBucketBooks } = useBucketsStore.getState();
  const covers = new Set();
  const addCovers = (books) => (books || []).forEach((b) => b.cover_image_url && covers.add(b.cover_image_url));

  const pages = [
    ...curatedBuckets.map((b) => {
      if (b.coverImageUrl) {
        covers.add(b.coverImageUrl);
      }
      return () => fetchCuratedBucketBooks(b.id);
    }),
    ...customBuckets.map((b) => () => fetchBucketBooks(b.id)),
  ];
  for (const fetchPage of pages) {
    if (!onWifi()) {
      return;
    }
    const { status, response, cached } = await fetchPage();
    if (status === 200 && !cached) {
      addCovers(response.books);
    }
  }

  let fetched = 0;
  for (const url of [...covers].slice(0, COVER_LIMIT)) {
    if (!onWifi()) {
      break;
    }
    // A cover that won't load is the placeholder's job, not a reason to stop.
    if (await Image.prefetch(url).catch(() => false)) {
      fetched += 1;
    }
  }
  log.info(`Bucket prefetch: ${pages.length} buckets, ${fetched} of ${covers.size} covers`);
};

export const prefetchShelf = async () => {
  if (running || !ManuscriptStore || !onWifi() || Date.now() - lastRun < MIN_GAP) {
    return;
  }
  running = true;
  lastRun = Date.now();
  try {
    await prefetchBuckets();
    const { status, response } = await fetchMyProgress();
    if (status !== 200 || !Array.isArray(response)) {
      return;
    }
    const urls = response
      .map((row) => row.book?.manuscript_url)
      .filter(Boolean)
      .slice(0, SHELF_LIMIT);
    let fetched = 0;
    for (const url of urls) {
      // Off Wi-Fi mid-way: stop, and pick up next time (R6.3).
      if (!onWifi()) {
        break;
      }
      if (await ManuscriptStore.isCached(url)) {
        continue;
      }
      if (await ManuscriptStore.prefetch(url)) {
        fetched += 1;
      }
    }
    // Nothing on screen says it ran; this is how to tell.
    log.info(`Shelf prefetch: ${fetched} downloaded, ${urls.length} on the shelf`);
  } catch (error) {
    log.warn('Shelf prefetch stopped:', error);
  } finally {
    running = false;
  }
};

// For tests: forget the last run.
export const resetPrefetch = () => {
  running = false;
  lastRun = 0;
};

const useShelfPrefetch = ({ isAuthenticated }) => {
  useEffect(() => {
    if (!isAuthenticated || Platform.OS !== 'ios') {
      return undefined;
    }
    prefetchShelf();
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        prefetchShelf();
      }
    });
    // Joining Wi-Fi while the app is open counts too.
    const unsubscribe = useConnectivityStore.subscribe((state, previous) => {
      if (state.wifi && !previous.wifi) {
        prefetchShelf();
      }
    });
    return () => {
      appState.remove();
      unsubscribe();
    };
  }, [isAuthenticated]);
};

export default useShelfPrefetch;
