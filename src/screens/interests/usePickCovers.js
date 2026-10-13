import { useEffect, useMemo, useState } from 'react';
import { Image } from 'react-native';
import { fetchDiscover } from '../../services/discoverService';
import log from '../../utils/logger';

const MAX_COVERS = 5;
const PREFETCH_COVERS = MAX_COVERS;

// Popular books per subgenre, for the life of the app: opening the screen a
// second time (from Settings) shows its covers at once.
const cache = new Map();
const inFlight = new Map();

const loadGenre = (genre) => {
  if (cache.has(genre)) {
    return Promise.resolve(cache.get(genre));
  }
  if (!inFlight.has(genre)) {
    inFlight.set(genre, fetchDiscover(genre)
      .then(({ status, response }) => (status === 200 ? response.popular || [] : []))
      .catch((error) => {
        log.error('Pick covers failed for', genre, error);
        return [];
      })
      .then((books) => {
        cache.set(genre, books);
        inFlight.delete(genre);
        // Start the image downloads now, so a cover is ready by the time
        // its genre is picked.
        books.slice(0, PREFETCH_COVERS).forEach((b) => {
          if (b.cover_image_url) {
            Image.prefetch(b.cover_image_url).catch(() => {});
          }
        });
        return books;
      }));
  }
  return inFlight.get(genre);
};

// Each picked subgenre's popular books, dealt round-robin so every pick
// shows, up to five, no book twice.
const deal = (genres) => {
  const lists = genres.map((g) => cache.get(g) || []);
  const seen = new Set();
  const dealt = [];
  for (let i = 0; dealt.length < MAX_COVERS && lists.some((l) => i < l.length); i += 1) {
    for (const list of lists) {
      const book = list[i];
      if (book && !seen.has(book.book_id) && dealt.length < MAX_COVERS) {
        seen.add(book.book_id);
        dealt.push(book);
      }
    }
  }
  return dealt;
};

// Covers for "From your picks" (14a). Discover's genre values are the same
// subgenre strings the chips carry (api-go discoverGenres), so a pick is
// fetched as is. The picks are fetched first, then every other chip's genre
// in the background, so a new pick usually finds its covers already here.
// When everything picked is cached the row updates in the same render; the
// last covers stay up while anything new loads.
const usePickCovers = (picked, allGenres = []) => {
  const key = picked.join('\n');
  const genres = useMemo(() => (key ? key.split('\n') : []), [key]);
  const allCached = genres.every((g) => cache.has(g));
  const [loaded, setLoaded] = useState(0);

  // Warm the rest once the picks are in hand.
  const allKey = allGenres.join('\n');
  useEffect(() => {
    if (!allKey) {
      return;
    }
    const others = allKey.split('\n').filter((g) => !cache.has(g));
    Promise.all(genres.map(loadGenre)).then(() => others.forEach(loadGenre));
    // Only when the chip list arrives; picks have their own effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKey]);

  useEffect(() => {
    if (genres.length === 0 || allCached) {
      return undefined;
    }
    let cancelled = false;
    Promise.all(genres.map(loadGenre)).then(() => {
      if (!cancelled) {
        setLoaded((n) => n + 1);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [genres, allCached]);

  const [shown, setShown] = useState([]);
  const next = useMemo(
    () => (allCached ? deal(genres) : null),
    // `loaded` re-deals once a fetch lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [genres, allCached, loaded],
  );
  useEffect(() => {
    if (next) {
      setShown(next);
    }
  }, [next]);

  if (genres.length === 0) {
    return [];
  }
  return next || shown;
};

export default usePickCovers;
