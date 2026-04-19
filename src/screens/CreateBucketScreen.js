import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { newBookCard as BookCard } from '../components/Card';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';
import useBooksStore from '../stores/booksStore';
import { showToast } from '../components/Toaster';
import log from '../utils/logger';

const CreateBucketScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const books = useBooksStore((s) => s.books);
    const createBucket = useBucketsStore((s) => s.createBucket);

    const toggleBook = (bookId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(bookId)) {
                next.delete(bookId);
            } else {
                next.add(bookId);
            }
            return next;
        });
    };

    const handleSave = () => {
        if (!name.trim()) {
            showToast('Please enter a bucket name.', 'error');
            return;
        }
        createBucket(name.trim(), Array.from(selectedIds));
        log.info('New custom bucket saved:', name.trim());
        showToast(`Bucket "${name.trim()}" created!`, 'success');
        navigation.goBack();
    };

    const renderBook = ({ item }) => {
        const isSelected = selectedIds.has(item.book_id);
        return (
            <TouchableOpacity
                style={[styles.bookItem, isSelected && styles.bookItemSelected]}
                onPress={() => toggleBook(item.book_id)}
                activeOpacity={0.7}
            >
                <View style={styles.bookCardWrapper}>
                    <BookCard book={item} onPress={() => toggleBook(item.book_id)} />
                </View>
                {isSelected && (
                    <View style={styles.checkBadge}>
                        <Icon name="checkmark-circle" size={24} color={DS.colors.primary} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="close" size={24} color={DS.colors.onSurface} />
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

                {/* Book selection */}
                <View style={styles.selectionHeader}>
                    <Text style={styles.selectionTitle}>Pick Books</Text>
                    <Text style={styles.selectionCount}>
                        {selectedIds.size} selected
                    </Text>
                </View>

                <FlatList
                    data={books}
                    keyExtractor={(item, index) => item.book_id?.toString() ?? `book-${index}`}
                    renderItem={renderBook}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.row}
                    showsVerticalScrollIndicator={false}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
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
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: DS.radius.sm,
    },
    saveButtonDisabled: {
        opacity: 0.4,
    },
    saveButtonText: {
        color: DS.colors.onPrimary,
        fontWeight: '700',
        fontSize: 14,
    },
    inputSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        color: DS.colors.onSurfaceVariant,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: DS.colors.surfaceContainerHigh,
        borderRadius: DS.radius.sm,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: DS.colors.onSurface,
        borderWidth: 1,
        borderColor: DS.colors.outlineVariant,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    selectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: DS.colors.onSurface,
    },
    selectionCount: {
        fontSize: 13,
        color: DS.colors.primary,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    bookItem: {
        flex: 1,
        maxWidth: '48%',
        borderRadius: DS.radius.sm,
        overflow: 'hidden',
    },
    bookItemSelected: {
        opacity: 0.85,
        borderWidth: 2,
        borderColor: DS.colors.primary,
        borderRadius: DS.radius.sm,
    },
    bookCardWrapper: {
        flex: 1,
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: DS.colors.background,
        borderRadius: 12,
    },
});

export default CreateBucketScreen;
