import { create } from 'zustand';
import log from '../utils/logger';
import enhanceedStorage from '../utils/enhanceedStorage';

const BUCKETS_STORAGE_KEY = 'custom_buckets';

// Pre-defined bucket definitions — criteria applied against the live books list
export const PREDEFINED_BUCKETS = [
    {
        id: 'recommended',
        name: 'Recommended',
        icon: '⭐',
        filter: (books) =>
            [...books]
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 10),
    },
    {
        id: 'new_arrivals',
        name: 'New Arrivals',
        icon: '🆕',
        filter: (books) =>
            [...books]
                .sort((a, b) => {
                    const dateA = a.publication_date || a.created_at || '';
                    const dateB = b.publication_date || b.created_at || '';
                    return new Date(dateB) - new Date(dateA);
                })
                .slice(0, 10),
    },
];

const loadFromStorage = () => {
    try {
        const data = enhanceedStorage.getUserPreference(BUCKETS_STORAGE_KEY, []);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
};

const saveToStorage = (buckets) => {
    try {
        enhanceedStorage.storeUserPreference(BUCKETS_STORAGE_KEY, buckets);
    } catch (e) {
        log.error('Failed to persist buckets:', e);
    }
};

const useBucketsStore = create((set, get) => ({
    customBuckets: loadFromStorage(),

    createBucket: (name, bookIds = []) => {
        const newBucket = {
            id: `bucket_${Date.now()}`,
            name: name.trim(),
            bookIds,
            createdAt: new Date().toISOString(),
        };
        const updated = [...get().customBuckets, newBucket];
        set({ customBuckets: updated });
        saveToStorage(updated);
        log.info('Bucket created:', newBucket.name);
        return newBucket;
    },

    updateBucket: (id, changes) => {
        const updated = get().customBuckets.map((b) =>
            b.id === id ? { ...b, ...changes } : b,
        );
        set({ customBuckets: updated });
        saveToStorage(updated);
    },

    deleteBucket: (id) => {
        const updated = get().customBuckets.filter((b) => b.id !== id);
        set({ customBuckets: updated });
        saveToStorage(updated);
        log.info('Bucket deleted:', id);
    },

    addBookToBucket: (bucketId, bookId) => {
        const updated = get().customBuckets.map((b) => {
            if (b.id !== bucketId) return b;
            if (b.bookIds.includes(bookId)) return b;
            return { ...b, bookIds: [...b.bookIds, bookId] };
        });
        set({ customBuckets: updated });
        saveToStorage(updated);
    },

    removeBookFromBucket: (bucketId, bookId) => {
        const updated = get().customBuckets.map((b) => {
            if (b.id !== bucketId) return b;
            return { ...b, bookIds: b.bookIds.filter((id) => id !== bookId) };
        });
        set({ customBuckets: updated });
        saveToStorage(updated);
    },
}));

export default useBucketsStore;
