// src/screens/ManuscriptScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import PdfViewer from '../components/PdfViewer';
import log from '../utils/logger';
import useReadingProgressStore from '../stores/readingProgressStore';

const ManuscriptScreen = ({ route }) => {
  const { book } = route.params;
  const pdfUrl = book.manuscript_url;
  const setCurrentBook = useReadingProgressStore((s) => s.setCurrentBook);
  const addToRecentBooks = useReadingProgressStore((s) => s.addToRecentBooks);
  const saveProgress = useReadingProgressStore((s) => s.saveProgress);

  log.info(`ManuscriptScreen loaded for book: ${book.title}`);
  log.info('pdfDetails:', {
    url: pdfUrl,
    title: book.title,
  });

  useEffect(() => {
    setCurrentBook(book);
    addToRecentBooks(book);

    return () => {
      // Save progress when leaving the screen
      saveProgress(book.book_id, { lastReadAt: Date.now() });
      setCurrentBook(null);
    };
  }, [book, setCurrentBook, addToRecentBooks, saveProgress]);

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <PdfViewer
          pdfUrl={pdfUrl}
          pdfTitle={book.title}
          style={styles.pdf}
        />
      ) : (
        // Fallback for Android or other platforms if you don't implement native Android module
        <Text style={styles.platformMessage}>PDF viewing is currently only supported on iOS.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  platformMessage: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default ManuscriptScreen;