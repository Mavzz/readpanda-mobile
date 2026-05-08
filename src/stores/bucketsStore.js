import { create } from 'zustand';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest, makeAuthenticatedPostRequest } from '../services/authenticatedRequests';

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
            }
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

        // TODO: call DELETE /users/me/buckets/:id when API is ready
        log.info('Bucket deleted:', bucketId);
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
}));

export default useBucketsStore;
