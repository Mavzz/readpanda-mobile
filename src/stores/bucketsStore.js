import { create } from 'zustand';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { showToast } from '../components/Toaster';
import { makeAuthenticatedGetRequest, makeAuthenticatedPostRequest, makeAuthenticatedPutRequest, makeAuthenticatedDeleteRequest } from '../services/authenticatedRequests';
import persistSlice from './persistSlice';

const normalizeBucket = (bucket) => ({
  id: bucket.id,
  name: bucket.name,
  bookCount: bucket.book_count || 0,
  booksPreview: bucket.books_preview || [],
  // 9c's "{f}/{n}" and 9b's "Saved" state.
  finishedCount: bucket.finished_count || 0,
  sourceCuratedId: bucket.source_curated_id || null,
  // The last rename or book added — 10e's Updated sort.
  updatedAt: bucket.updated_at || bucket.created_at || null,
});

// Curated buckets as /home/our-picks and /discover return them.
export const normalizeCuratedBucket = (bucket) => ({
  id: bucket.id,
  name: bucket.title,
  bookIds: (bucket.books_preview || []).map(b => b.book_id),
  coverImageUrl: bucket.cover_image_url,
  bookCount: bucket.book_count || 0,
  sortOrder: bucket.sort_order,
  isActive: bucket.is_active,
  isCurated: true,
  booksPreview: bucket.books_preview || [],
  description: bucket.description || null,
  genreTags: bucket.genre_tags || [],
  // Only under a Discover genre filter.
  matchingCount: bucket.matching_count ?? null,
  readingMinutes: bucket.reading_minutes ?? null,
  savedBucketId: bucket.saved_bucket_id || null,
});

const useBucketsStore = create((set, get) => ({
  customBuckets: [],
  curatedBuckets: [],
  loadingCustomBuckets: false,
  loadingCuratedBuckets: false,
  refreshing: false,

  // ── Custom Buckets (user-created, stored on backend) ─────────────────

  fetchCustomBuckets: async () => {
    set({ loadingCustomBuckets: true });
    log.info('Fetching custom buckets');

    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl('/users/me/buckets'),
      );

      if (status === 200) {
        log.info('Custom buckets fetched:', response);
        const normalized = (response.buckets || []).map(normalizeBucket);
        set({ customBuckets: normalized });
      } else {
        log.error('Failed to fetch custom buckets:', response);
      }
      return { status };
    } catch (error) {
      log.error('Error fetching custom buckets:', error);
      return { status: null, error };
    } finally {
      set({ loadingCustomBuckets: false });
    }
  },

  saveBucket: async (name, bookIds = []) => {
    try {
      const { status, response } = await makeAuthenticatedPostRequest(
        getBackendUrl('/users/me/buckets'),
        {
          Name: name.trim(),
          book_ids: bookIds,
        },
      );

      if (status === 200 || status === 201) {
        log.info('Bucket created:', response);
        // API returns a single bucket object, not an array
        const newBucket = normalizeBucket(response.bucket);
        set({ customBuckets: [...get().customBuckets, newBucket] });
      } else {
        log.error('Error creating bucket:', response);
      }

      return { status, response };
    } catch (error) {
      log.error('Error creating bucket:', error);
      return { status: null, response: error };
    }
  },

  deleteBucket: async (bucketId) => {
    // Optimistically remove from state
    const prev = get().customBuckets;
    set({ customBuckets: prev.filter((b) => b.id !== bucketId) });

    try {
      const { status, response } = await makeAuthenticatedDeleteRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}`),
      );

      if (status === 200 || status === 204) {
        log.info('Bucket deleted:', bucketId);
        showToast('Bucket deleted successfully');
      } else {
        log.error('Failed to delete bucket from server, reverting state:', response);
        // Revert state if deletion fails
        set({ customBuckets: prev });
        showToast('Failed to delete bucket');
      }
    } catch (error) {
      log.error('Error deleting bucket:', error);
      // Revert state on error
      set({ customBuckets: prev });
      showToast('Failed to delete bucket');
    }
  },

  removeBookFromBucket: async (bucketId, bookId) => {
    const prev = get().customBuckets;
        
    set({
      customBuckets: prev.map(bucket => {
        if (bucket.id === bucketId) {
          return {
            ...bucket,
            bookCount: Math.max(0, bucket.bookCount - 1),
            booksPreview: bucket.booksPreview.filter(b => b.book_id !== bookId),
          };
        }
        return bucket;
      }),
    });

    try {
      const { status } = await makeAuthenticatedDeleteRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}/books/${bookId}`),
      );
            
      if (status === 200 || status === 204) {
        log.info('Book removed from bucket:', bookId);
        return true;
      }
      log.error('Failed to remove book, reverting state');
    } catch (error) {
      log.error('Error removing book from bucket:', error);
    }
    set({ customBuckets: prev });
    showToast('Failed to remove book');
    return false;
  },

  // Book detail's Add to bucket sheet (8c). Optimistic like the removal above:
  // the tick appears at once, and comes back off if the server says no.
  addBookToBucket: async (bucketId, book) => {
    const prev = get().customBuckets;
    const preview = {
      book_id: book.book_id,
      title: book.title,
      cover_image_url: book.cover_image_url || null,
    };

    set({
      customBuckets: prev.map(bucket => (
        bucket.id === bucketId
          ? {
            ...bucket,
            bookCount: bucket.bookCount + 1,
            booksPreview: [...bucket.booksPreview, preview],
          }
          : bucket
      )),
    });

    try {
      const { status } = await makeAuthenticatedPostRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}/books`),
        { book_ids: [book.book_id] },
      );
      if (status === 200 || status === 201) {
        log.info('Book added to bucket:', book.book_id);
        return true;
      }
      log.error('Failed to add book, reverting state');
    } catch (error) {
      log.error('Error adding book to bucket:', error);
    }
    set({ customBuckets: prev });
    showToast('Failed to add book');
    return false;
  },

  // A bucket's whole page for 9a: every book in its manual order, each with
  // the reader's own progress. Returns { status, response: { id, name, books } }.
  fetchBucketBooks: async (bucketId) => {
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}/books`),
      );
      if (status === 200) {
        return { status, response: { ...response, books: response.books || [] } };
      }
      log.error('Failed to fetch bucket books:', response);
      return { status, response: null };
    } catch (error) {
      log.error('Error fetching bucket books:', error);
      return { status: null, response: null };
    }
  },

  // 9a edit mode. Optimistic on the caller's side (it already shows the new
  // order); a failure just tells the reader it didn't stick.
  reorderBucket: async (bucketId, bookIds) => {
    try {
      const { status } = await makeAuthenticatedPutRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}/order`),
        { book_ids: bookIds },
      );
      if (status === 200 || status === 204) {
        // The tile's cover stack is the first three in this order.
        get().fetchCustomBuckets();
        return true;
      }
    } catch (error) {
      log.error('Error reordering bucket:', error);
    }
    showToast('Couldn\'t save the new order');
    return false;
  },

  renameBucket: async (bucketId, name) => {
    const prev = get().customBuckets;
    set({ customBuckets: prev.map(b => (b.id === bucketId ? { ...b, name } : b)) });
    try {
      const { status } = await makeAuthenticatedPutRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}`),
        { name },
      );
      if (status === 200 || status === 204) {
        return true;
      }
    } catch (error) {
      log.error('Error renaming bucket:', error);
    }
    set({ customBuckets: prev });
    showToast('Couldn\'t rename the bucket');
    return false;
  },

  // 9b "Save to My Books": the server copies the curated bucket's books and
  // order, and returns the existing copy if this reader already saved it.
  saveCuratedBucket: async (curatedId) => {
    try {
      const { status, response } = await makeAuthenticatedPostRequest(
        getBackendUrl('/users/me/buckets'),
        { source_curated_id: curatedId },
      );
      if (status === 200 || status === 201) {
        await get().fetchCustomBuckets();
        return response.bucket?.id || null;
      }
      log.error('Failed to save curated bucket:', response);
      showToast(response?.error || 'Couldn\'t save this bucket');
    } catch (error) {
      log.error('Error saving curated bucket:', error);
      showToast('Couldn\'t save this bucket');
    }
    return null;
  },

  // ── Curated Buckets (editorially curated, read-only) ─────────────────

  fetchCuratedBuckets: async (showRefresh = false) => {
    if (showRefresh) {
      set({ refreshing: true });
    } else {
      set({ loadingCuratedBuckets: true });
    }
    log.info('Fetching curated buckets');

    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl('/home/our-picks'),
      );

      if (status === 200) {
        log.info('Curated buckets fetched successfully:', response);
        const normalizedBuckets = (response.buckets || []).map(normalizeCuratedBucket);
        set({ curatedBuckets: normalizedBuckets });
      } else {
        log.error('Failed to fetch curated buckets:', response);
      }
      return { status };
    } catch (error) {
      log.error('Error fetching curated buckets:', error);
      return { status: null, error };
    } finally {
      set({ loadingCuratedBuckets: false, refreshing: false });
    }
  },

  // A curated bucket's whole page for 9b: its editorial line, tags, reading
  // time, saved state, and every book with the reader's progress.
  fetchCuratedBucketBooks: async (bucketId) => {
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl(`/home/our-picks/${bucketId}/books`),
      );
      if (status === 200) {
        return { status, response: { ...response, books: response.books || [] } };
      }
      log.error('Failed to fetch curated bucket books:', response);
      return { status, response: null };
    } catch (error) {
      log.error('Error fetching curated bucket books:', error);
      return { status: null, response: null };
    }
  },

  clearBuckets: () => {
    set({ customBuckets: [], curatedBuckets: [] });
  },
}));

export const hydrateBuckets = persistSlice(useBucketsStore, 'buckets', {
  pick: (s) => ({ customBuckets: s.customBuckets, curatedBuckets: s.curatedBuckets }),
  restore: ({ customBuckets, curatedBuckets }) => ({
    customBuckets: customBuckets || [],
    curatedBuckets: curatedBuckets || [],
  }),
});

export default useBucketsStore;
