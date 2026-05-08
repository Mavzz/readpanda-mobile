import { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { useEffect } from 'react';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';
import useBooksStore from '../stores/booksStore';
import { showToast } from '../components/Toaster';
import log from '../utils/logger';
import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedPostRequest } from '../services/authenticatedRequests';

/* ── Selectable Book Card ─────────────────────────────────────────────────── */
const SelectableBookCard = ({ book, isSelected, onToggle }) => {
    const scale = useSharedValue(1);
    const selectAnim = useSharedValue(isSelected ? 1 : 0);

    useEffect(() => {
        selectAnim.value = withSpring(isSelected ? 1 : 0, {
            damping: 16,
            stiffness: 200,
        });
    }, [isSelected]);

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const containerAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const overlayAnimStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            selectAnim.value,
            [0, 1],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const checkAnimStyle = useAnimatedStyle(() => ({
        transform: [
            {
                scale: interpolate(
                    selectAnim.value,
                    [0, 0.5, 1],
                    [0, 1.2, 1],
                    Extrapolation.CLAMP
                ),
            },
        ],
        opacity: selectAnim.value,
    }));

    const borderAnimStyle = useAnimatedStyle(() => ({
        borderColor: isSelected ? DS.colors.primary : 'transparent',
        borderWidth: interpolate(
            selectAnim.value,
            [0, 1],
            [0, 2],
            Extrapolation.CLAMP
        ),
    }));

    const coverUrl = book?.cover_image_url;

    return (
        <Animated.View style={[styles.selectableCard, containerAnimStyle, borderAnimStyle]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => onToggle(book.id)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.selectableCardInner}
            >
                {/* Book Cover */}
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

                    {/* Selection overlay */}
                    <Animated.View style={[styles.selectionOverlay, overlayAnimStyle]}>
                        <Animated.View style={[styles.checkCircle, checkAnimStyle]}>
                            <Icon name="checkmark" size={20} color={DS.colors.onPrimary} />
                        </Animated.View>
                    </Animated.View>
                </View>

                {/* Book Info */}
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

/* ── Main Screen ──────────────────────────────────────────────────────────── */
const CreateBucketScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const books = useBooksStore((s) => s.books);
    const fetchBooks = useBooksStore((s) => s.fetchBooks);
    const saveBucket = useBucketsStore((s) => s.saveBucket);

    const toggleBook = useCallback((bookId) => {
        log.info('Book toggled:', bookId);
        setSelectedIds((prev) => {
            let next;
            if (prev.includes(bookId)) {
                log.info('Removing book:', bookId);
                next = prev.filter((id) => id !== bookId);
            } else {
                log.info('Adding book:', bookId);
                next = [...prev, bookId];
            }
            log.info('Selected IDs:', next);
            return next;
        });
    }, []);

    const handleSave = async () => {
        if (!name.trim()) {
            showToast('Please enter a bucket name.', 'error');
            return;
        }
        const { status, response } = await saveBucket(name.trim(), selectedIds);
        if (status === 200 || status === 201) {
            showToast(`Bucket "${name.trim()}" created!`, 'success');
            navigation.goBack();
        } else {
            showToast('Error creating bucket.', 'error');
        }
    };

    const loadBooks = async () => {
        const { status } = await fetchBooks();
        if (status !== 200 && status !== null) {
            showToast('Connection error. Please try again.', 'error');
        }
    };

    const renderBook = useCallback(({ item }) => {

        const isSelected = selectedIds.includes(item.id);
        return (
            <SelectableBookCard
                book={item}
                isSelected={isSelected}
                onToggle={toggleBook}
            />
        );
    }, [selectedIds, toggleBook]);

    useEffect(() => {
        loadBooks();
    }, [fetchBooks]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Icon name="close" size={22} color={DS.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Bucket</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
                        disabled={!name.trim()}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>

                {/* Name input */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Bucket Name</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Weekend Reads"
                        placeholderTextColor={DS.colors.onSurfaceVariant}
                        maxLength={40}
                        autoFocus
                    />
                </View>

                {/* Book selection header */}
                <View style={styles.selectionHeader}>
                    <Text style={styles.selectionTitle}>Pick Books</Text>
                    {selectedIds.size > 0 ? (
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>
                                {selectedIds.size}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.selectionHint}>Tap to select</Text>
                    )}
                </View>

                <FlatList
                    data={books}
                    keyExtractor={(item, index) => item.id?.toString() ?? `book-${index}`}
                    renderItem={renderBook}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                    extraData={selectedIds}
                />
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
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
    closeButton: {
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
    saveButton: {
        backgroundColor: DS.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: DS.radius.full,
    },
    saveButtonDisabled: {
        opacity: 0.3,
    },
    saveButtonText: {
        color: DS.colors.onPrimary,
        fontWeight: '700',
        fontSize: 14,
    },

    // Input
    inputSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 13,
        color: DS.colors.onSurfaceVariant,
        marginBottom: 8,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: DS.colors.surfaceContainerHigh,
        borderRadius: DS.radius.sm,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: DS.colors.onSurface,
        borderWidth: 1,
        borderColor: DS.colors.outlineVariant,
    },

    // Selection header
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    selectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: DS.colors.onSurface,
    },
    selectionHint: {
        fontSize: 13,
        color: DS.colors.onSurfaceVariant,
        fontStyle: 'italic',
    },
    countBadge: {
        backgroundColor: DS.colors.primary,
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    countBadgeText: {
        color: DS.colors.onPrimary,
        fontSize: 13,
        fontWeight: '700',
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

    // Selectable card
    selectableCard: {
        flex: 1,
        maxWidth: '48%',
        borderRadius: DS.radius.sm,
        overflow: 'hidden',
        backgroundColor: DS.colors.surfaceContainerLow,
    },
    selectableCardInner: {
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

    // Selection overlay
    selectionOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(11, 19, 38, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: DS.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: DS.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    },

    // Book info
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
});

export default CreateBucketScreen;
