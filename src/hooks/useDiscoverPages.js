import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDiscover } from '../services/discoverService';
import { normalizeCuratedBucket } from '../stores/bucketsStore';
import enhancedStorage from '../utils/enhancedStorage';
import log from '../utils/logger';

const FOR_YOU_CACHE = 'discover_for_you';

// GET /discover, one page per genre chip ('' for For you), shared by Discover
// and its two "See all" grids.
//
// Pages are kept per genre so flicking back to a chip shows it at once while
// it revalidates. For you also starts from last launch's copy. Only the
// newest request decides `failed`: a slow response for a chip the reader has
// already left still fills that chip's page, but can't flag the one they're on.
//
// Pass `enabled: false` from a screen that only sometimes shows Discover data.
const useDiscoverPages = (genre, { enabled = true } = {}) => {
  const [pages, setPages] = useState(() => {
    const saved = enhancedStorage.readCache(FOR_YOU_CACHE);
    return saved?.page ? { '': saved.page } : {};
  });
  const [genres, setGenres] = useState(() => enhancedStorage.readCache(FOR_YOU_CACHE)?.genres || []);
  const [failed, setFailed] = useState(false);
  const latest = useRef(null);

  const load = useCallback(async (forGenre) => {
    const key = forGenre || '';
    latest.current = key;
    try {
      const { status, response } = await fetchDiscover(forGenre);
      if (status !== 200) {
        throw new Error(response?.error || `status ${status}`);
      }
      const page = {
        curated: (response.curated || []).map(normalizeCuratedBucket),
        popular: response.popular || [],
      };
      setPages((prev) => ({ ...prev, [key]: page }));
      setGenres(response.genres || []);
      if (!key) {
        enhancedStorage.writeCache(FOR_YOU_CACHE, { page, genres: response.genres || [] });
      }
      if (latest.current === key) {
        setFailed(false);
      }
    } catch (error) {
      log.error('Failed to load Discover:', error);
      if (latest.current === key) {
        setFailed(true);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      load(genre);
    }
  }, [enabled, genre, load]);

  const reload = useCallback(() => load(genre), [load, genre]);

  // undefined until this chip's page has arrived (or came from the cache).
  const page = pages[genre || ''];
  const genreLabel = genres.find((g) => g.value === genre)?.label || genre;

  return { page, genres, genreLabel, failed, reload };
};

export default useDiscoverPages;
