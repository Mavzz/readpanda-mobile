import { create } from 'zustand';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { showToast } from '../components/Toaster';
import { makeAuthenticatedGetRequest, makeAuthenticatedPostRequest, makeAuthenticatedDeleteRequest } from '../services/authenticatedRequests';

const normalizeBucket = (bucket) => ({
  id: bucket.id,
  name: bucket.name,
  bookCount: bucket.book_count || 0,
  booksPreview: bucket.books_preview || [],
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
      } else {
        log.error('Failed to remove book, reverting state');
        set({ customBuckets: prev });
        showToast('Failed to remove book');
      }
    } catch (error) {
      log.error('Error removing book from bucket:', error);
      set({ customBuckets: prev });
      showToast('Failed to remove book');
    }
  },

  // The list endpoints only ever return a 2-book books_preview — this fetches
  // the full book list for a single bucket's detail screen.
  fetchBucketBooks: async (bucketId) => {
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl(`/users/me/buckets/${bucketId}/books`),
      );
      if (status === 200) {
        return { status, response: response.books || [] };
      }
      log.error('Failed to fetch bucket books:', response);
      return { status, response: [] };
    } catch (error) {
      log.error('Error fetching bucket books:', error);
      return { status: null, response: [] };
    }
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
        const normalizedBuckets = (response.buckets || []).map(bucket => ({
          id: bucket.id,
          name: bucket.title,
          bookIds: (bucket.books_preview || []).map(b => b.book_id),
          coverImageUrl: bucket.cover_image_url,
          bookCount: bucket.book_count,
          sortOrder: bucket.sort_order,
          isActive: bucket.is_active,
          isCurated: true,
          booksPreview: bucket.books_preview || [],
        }));
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

  // Same idea as fetchBucketBooks but for a curated bucket's full book list.
  fetchCuratedBucketBooks: async (bucketId) => {
    try {
      const { status, response } = await makeAuthenticatedGetRequest(
        getBackendUrl(`/home/our-picks/${bucketId}/books`),
      );
      if (status === 200) {
        return { status, response: response.books || [] };
      }
      log.error('Failed to fetch curated bucket books:', response);
      return { status, response: [] };
    } catch (error) {
      log.error('Error fetching curated bucket books:', error);
      return { status: null, response: [] };
    }
  },
}));

export default useBucketsStore;
