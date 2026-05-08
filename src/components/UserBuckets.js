import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';

const BUCKET_ICONS = [
    { name: 'library', color: '#ffddb8' },
    { name: 'bookmark', color: '#e8c49a' },
    { name: 'reader', color: '#ffb95f' },
    { name: 'book', color: '#ffddb8' },
    { name: 'albums', color: '#e8c49a' },
    { name: 'layers', color: '#ffb95f' },
];

const getBucketIcon = (index) => BUCKET_ICONS[index % BUCKET_ICONS.length];

const UserBuckets = ({ navigation, customBuckets }) => {
    const deleteBucket = useBucketsStore((state) => state.deleteBucket);

    const handleDeleteBucket = (bucket) => {
        Alert.alert(
            'Delete Bucket',
            `Delete "${bucket.name}"? This won't remove the books from your library.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => deleteBucket(bucket.id)
                },
            ],
        );
    };

    const openBucket = (bucket) => {
        navigation.navigate('BucketBooksScreen', {
            books_preview: bucket.booksPreview,
            name: bucket.name,
            book_count: bucket.bookCount,
            bucket_id: bucket.id,
            isCustom: true,
        });
    };

    return (
        <View style={styles.section}>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Buckets</Text>
            </View>

            <TouchableOpacity
                style={styles.createBucketCard}
                onPress={() => navigation.navigate('CreateBucketScreen')}
            >
                <Icon name="add-circle-outline" size={24} color={DS.colors.primary} />
                <Text style={styles.createBucketText}>Create your own bucket</Text>
            </TouchableOpacity>

            {customBuckets.length > 0 && (
                <FlatList
                    data={customBuckets}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    renderItem={({ item, index }) => {
                        const icon = getBucketIcon(index);
                        return (
                            <TouchableOpacity
                                style={styles.bucketCard}
                                onPress={() => openBucket(item)}
                                //onLongPress={() => handleDeleteBucket(item)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.bucketCardCover}>
                                    <View style={styles.iconGlow}>
                                        <Icon name={icon.name} size={44} color={icon.color} />
                                    </View>
                                    <View style={styles.bookCountPill}>
                                        <Icon name="book-outline" size={12} color={DS.colors.onSurfaceVariant} />
                                        <Text style={styles.bookCountPillText}>{item.bookCount || 0}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteBucket(item)}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Icon name="trash" size={20} color={DS.colors.error} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.bucketCardName} numberOfLines={2}>{item.name}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Generic section wrapper
    section: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: DS.colors.onSurface,
        letterSpacing: -0.3,
    },

    // Bucket card
    bucketCard: {
        width: 160,
        backgroundColor: DS.colors.surfaceContainerLow,
        borderRadius: DS.radius.sm,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'flex-start',
        shadowColor: DS.colors.background,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
    },
    bucketCardCover: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: DS.radius.sm - 2,
        backgroundColor: DS.colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },
    iconGlow: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255, 221, 184, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookCountPill: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: DS.colors.surfaceContainerLowest,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 3,
    },
    bookCountPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: DS.colors.onSurfaceVariant,
    },
    bucketCardName: {
        fontSize: 13,
        fontWeight: '600',
        color: DS.colors.onSurface,
        textAlign: 'center',
    },
    deleteButton: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 10,
    },

    // Create bucket CTA
    createBucketCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: DS.colors.surfaceContainerLow,
        borderRadius: DS.radius.sm,
        borderWidth: 1,
        borderColor: DS.colors.outlineVariant,
        borderStyle: 'dashed',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    createBucketText: {
        fontSize: 14,
        fontWeight: '500',
        color: DS.colors.onSurfaceVariant,
    },
});

export default UserBuckets;