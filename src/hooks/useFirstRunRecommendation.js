import { useEffect, useState } from 'react';
import enhanceedStorage from '../utils/enhanceedStorage';
import log from '../utils/logger';
import { seedCollection } from '../utils/interests';

const CACHE_KEY = 'first_run_pick';

// "Recommendation source: first book of the user's top-interest collection;
// cache so it's stable between launches" (FIRST_RUN_3a_3b.md § 3a). Curated
// buckets come back in a different order on every fetch, so without the cache
// the first-run hero would recommend a different book each launch.
const useFirstRunRecommendation = (curatedBuckets, preferences) => {
  const [pick, setPick] = useState(() => enhanceedStorage.getUserPreference(CACHE_KEY));

  useEffect(() => {
    if (pick || !curatedBuckets?.length) {
      return;
    }

    const { bucket, interest } = seedCollection(curatedBuckets, preferences);
    const book = bucket?.booksPreview?.[0];
    if (!book) {
      return;
    }

    const next = {
      bookId: book.book_id,
      title: book.title,
      coverUrl: book.cover_image_url || null,
      manuscriptUrl: book.manuscript_url || null,
      collectionId: bucket.id,
      collectionName: bucket.name,
      interest,
    };
    log.info('Caching first-run recommendation:', next.title);
    enhanceedStorage.storeUserPreference(CACHE_KEY, next);
    setPick(next);
  }, [curatedBuckets, preferences, pick]);

  return pick;
};

export default useFirstRunRecommendation;
