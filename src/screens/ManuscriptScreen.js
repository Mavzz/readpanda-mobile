// src/screens/ManuscriptScreen.js
import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/Ionicons';
import PdfViewer from '../components/PdfViewer';
import log from '../utils/logger';
import useReadingProgressStore from '../stores/readingProgressStore';
import { DS } from '../styles/global';

const ManuscriptScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const pdfUrl = book.manuscript_url
    || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'; // TODO: remove test fallback
  const setCurrentBook = useReadingProgressStore((s) => s.setCurrentBook);
  const addToRecentBooks = useReadingProgressStore((s) => s.addToRecentBooks);
  const saveProgress = useReadingProgressStore((s) => s.saveProgress);
  const loadProgress = useReadingProgressStore((s) => s.loadProgress);

  const currentPageRef = useRef(0);
  const totalPagesRef = useRef(0);
  const savedProgress = loadProgress(book.book_id);
  const initialPage = savedProgress?.currentPage || 0;

  log.info(`ManuscriptScreen loaded for book: ${book.title}`);
  log.info('pdfDetails:', {
    url: pdfUrl,
    title: book.title,
    resumeFromPage: initialPage,
  });

  useEffect(() => {
    setCurrentBook(book);
    addToRecentBooks(book);

    return () => {
      saveProgress(
        book.book_id,
        {
          currentPage: currentPageRef.current,
          totalPages: totalPagesRef.current,
          lastReadAt: Date.now(),
        },
        book,
      );
      setCurrentBook(null);
    };
  }, [book, setCurrentBook, addToRecentBooks, saveProgress]);

  const handlePageChanged = useCallback((page, total) => {
    currentPageRef.current = page;
    totalPagesRef.current = total;
  }, []);

  const handleLoadComplete = useCallback((total) => {
    totalPagesRef.current = total;
    log.info(`PDF loaded: ${book.title} — ${total} pages`);
  }, [book.title]);

  const handleError = useCallback((message) => {
    log.error(`PDF error for ${book.title}: ${message}`);
  }, [book.title]);

  const renderContent = () => {
    if (Platform.OS !== 'ios') {
      return <Text style={styles.platformMessage}>PDF viewing is currently only supported on iOS.</Text>;
    }

    if (!pdfUrl) {
      return (
        <View style={styles.messageContainer}>
          <Icon name="document-text-outline" size={48} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.messageTitle}>No manuscript available</Text>
          <Text style={styles.messageSubtitle}>This book doesn't have a PDF file yet.</Text>
        </View>
      );
    }

    return (
      <PdfViewer
        pdfUrl={pdfUrl}
        pdfTitle={book.title}
        style={styles.pdf}
        initialPage={initialPage}
        onPageChanged={handlePageChanged}
        onLoadComplete={handleLoadComplete}
        onError={handleError}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={DS.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: DS.colors.onSurface,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginTop: 16,
  },
  messageSubtitle: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    marginTop: 8,
    textAlign: 'center',
  },
  platformMessage: {
    fontSize: 18,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default ManuscriptScreen;