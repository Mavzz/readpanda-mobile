import { View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import { newBookCard as BookCard } from '../components/Card';
import log from '../utils/logger';
import { DS } from '../styles/global';

const NUM_COLUMNS = 2;

const GenreBooksScreen = ({ route, navigation }) => {
    const { genre, books } = route.params;

    const openBook = (book) => {
        log.info(`Opening book: ${book.title}`);
        navigation.navigate('ManuscriptScreen', { book });
    };

    const renderBook = ({ item }) => (
        <View style={styles.cardWrapper}>
            <BookCard book={item} onPress={() => openBook(item)} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={DS.colors.onSurface} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{genre}</Text>
                <Text style={styles.bookCount}>{books.length} books</Text>
            </View>

            <FlatList
                data={books}
                keyExtractor={(item, index) => item.book_id?.toString() ?? `book-${index}`}
                renderItem={renderBook}
                numColumns={NUM_COLUMNS}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.row}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
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
        fontSize: 22,
        fontWeight: '700',
        color: DS.colors.onSurface,
        flex: 1,
    },
    bookCount: {
        fontSize: 14,
        color: DS.colors.onSurfaceVariant,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardWrapper: {
        flex: 1,
        maxWidth: '48%',
    },
});

export default GenreBooksScreen;
