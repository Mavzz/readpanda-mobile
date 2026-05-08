import { View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity, Image } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import log from '../utils/logger';
import { DS } from '../styles/global';

const NUM_COLUMNS = 2;

/* ── Book Card (matches CreateBucketScreen style) ─────────────────────────── */
const BucketBookCard = ({ book, onPress }) => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const containerAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const coverUrl = book?.cover_image_url;

    return (
        <Animated.View style={[styles.bookCard, containerAnimStyle]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => onPress(book)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.bookCardInner}
            >
                <View style={styles.coverContainer}>
                    {coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.coverPlaceholder}>
                            <Text style={styles.placeholderEmoji}>📚</Text>
                            <Text style={styles.placeholderTitle} numberOfLines={2}>
                                {book?.title || 'Book'}
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={styles.bookTitle} numberOfLines={2}>
                    {book?.title || 'Untitled'}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                    {book?.author_name || 'Unknown Author'}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

/* ── Screen ───────────────────────────────────────────────────────────────── */
const BucketBooksScreen = ({ route, navigation }) => {
    const { books_preview, name, book_count } = route.params;

    const openBook = (book) => {
        log.info(`Opening book: ${book.title}`);
        navigation.navigate('ManuscriptScreen', { book });
    };

    const renderBook = ({ item }) => (
        <BucketBookCard book={item} onPress={openBook} />
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={22} color={DS.colors.onSurfaceVariant} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {name}
                </Text>
                <Text style={styles.bookCount}>{book_count} books</Text>
            </View>

            {books_preview.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="book-outline" size={48} color={DS.colors.onSurfaceVariant} />
                    <Text style={styles.emptyTitle}>No books yet</Text>
                    <Text style={styles.emptySubtitle}>Add books to this bucket from the library.</Text>
                </View>
            ) : (
                <FlatList
                    data={books_preview}
                    keyExtractor={(item, index) => item.book_id?.toString() ?? `book-${index}`}
                    renderItem={renderBook}
                    numColumns={NUM_COLUMNS}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DS.colors.background,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: DS.colors.surfaceContainerHigh,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: DS.colors.onSurface,
        flex: 1,
    },
    bookCount: {
        fontSize: 14,
        color: DS.colors.onSurfaceVariant,
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    // Book card — same as CreateBucketScreen
    bookCard: {
        flex: 1,
        maxWidth: '48%',
        borderRadius: DS.radius.sm,
        overflow: 'hidden',
        backgroundColor: DS.colors.surfaceContainerLow,
    },
    bookCardInner: {
        padding: 10,
    },
    coverContainer: {
        width: '100%',
        aspectRatio: 0.72,
        borderRadius: DS.radius.sm - 2,
        overflow: 'hidden',
        marginBottom: 10,
        backgroundColor: DS.colors.surfaceContainerHigh,
    },
    coverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    coverPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
    },
    placeholderEmoji: {
        fontSize: 28,
        marginBottom: 6,
    },
    placeholderTitle: {
        fontSize: 11,
        color: DS.colors.onSurfaceVariant,
        textAlign: 'center',
        fontWeight: '500',
    },
    bookTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: DS.colors.onSurface,
        textAlign: 'center',
        lineHeight: 17,
    },
    bookAuthor: {
        fontSize: 11,
        color: DS.colors.onSurfaceVariant,
        textAlign: 'center',
        marginTop: 2,
    },

    // Empty state
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: DS.colors.onSurface,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: DS.colors.onSurfaceVariant,
        textAlign: 'center',
        opacity: 0.7,
    },
});

export default BucketBooksScreen;
