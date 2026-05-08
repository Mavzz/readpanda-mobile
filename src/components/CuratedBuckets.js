import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';

const BUCKET_ICONS = [
    { name: 'sparkles', color: '#ffddb8' },
    { name: 'diamond', color: '#e8c49a' },
    { name: 'star', color: '#ffb95f' },
    { name: 'trophy', color: '#ffddb8' },
    { name: 'ribbon', color: '#e8c49a' },
    { name: 'flame', color: '#ffb95f' },
];

const getBucketIcon = (index) => BUCKET_ICONS[index % BUCKET_ICONS.length];

const CuratedBuckets = ({ navigation, curatedBuckets }) => {

    const openBucket = (booksPreview, name, bookCount) => {
        navigation.navigate('BucketBooksScreen', {
            books_preview: booksPreview,
            name,
            book_count: bookCount,
        });
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Curated Picks</Text>
                <Text style={styles.seeAllText}>See All ({curatedBuckets.length})</Text>
            </View>
            <FlatList
                data={curatedBuckets}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.row}
                contentContainerStyle={styles.listContent}
                renderItem={({ item, index }) => {
                    const icon = getBucketIcon(index);
                    return (
                        <TouchableOpacity
                            style={styles.bucketCard}
                            onPress={() => openBucket(item.booksPreview, item.name, item.bookCount)}
                            activeOpacity={0.85}
                        >
                            <View style={styles.bucketCardCover}>
                                <View style={styles.iconGlow}>
                                    <Icon name={icon.name} size={44} color={icon.color} />
                                </View>
                                <View style={styles.bookCountPill}>
                                    <Icon name="book-outline" size={12} color={DS.colors.onSurfaceVariant} />
                                    <Text style={styles.bookCountPillText}>{item.bookCount || 0}</Text>
                                </View>
                            </View>
                            <Text style={styles.bucketCardName} numberOfLines={2}>
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: DS.colors.primary,
    },
    seeAllText: {
        fontSize: 13,
        color: DS.colors.onSurfaceVariant,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 8,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    // Bucket card — matches UserBuckets style
    bucketCard: {
        width: '48%',
        backgroundColor: DS.colors.surfaceContainerLow,
        borderRadius: DS.radius.sm,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'flex-start',
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
        width: '100%',
    },
});

export default CuratedBuckets;