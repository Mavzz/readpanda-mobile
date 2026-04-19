import React, { useState, useCallback } from 'react';
import {
  requireNativeComponent,
  Platform,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import log from '../utils/logger';

const LINKING_ERROR =
  'The native module for PDF Viewer is not available. Make sure: \n\n' +
  Platform.select({ ios: '- You have run \'pod install\' in the \'ios\' directory and restarted your project.\n', default: '' });

// The name 'RNPdfViewer' must exactly match the RCT_EXPORT_MODULE name from RNPdfViewerManager.m
const RNPdfViewerComponent = Platform.select({
  ios: requireNativeComponent('RNPdfViewer'),
  default: () => {
    if (__DEV__) {
      console.warn(LINKING_ERROR);
    }
    return null; // Return null on unsupported platforms
  },
});

const PdfViewer = ({ pdfUrl, pdfTitle, style, initialPage, onPageChanged, onLoadComplete, onError }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage || 0);

  const handleLoadComplete = useCallback((event) => {
    const { totalPages: pages } = event.nativeEvent;
    log.info(`PDF loaded: ${pdfTitle} (${pages} pages)`);
    setTotalPages(pages);
    setLoading(false);
    setError(null);
    onLoadComplete?.(pages);
  }, [pdfTitle, onLoadComplete]);

  const handlePageChanged = useCallback((event) => {
    const { currentPage: page, totalPages: pages } = event.nativeEvent;
    setCurrentPage(page);
    setTotalPages(pages);
    onPageChanged?.(page, pages);
  }, [onPageChanged]);

  const handleError = useCallback((event) => {
    const { message } = event.nativeEvent;
    log.error(`PDF error for ${pdfTitle}: ${message}`);
    setLoading(false);
    setError(message);
    onError?.(message);
  }, [pdfTitle, onError]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    // Force re-render by toggling a key isn't needed — we re-mount via error state clear
  }, []);

  if (Platform.OS !== 'ios') {
    return <RNPdfViewerComponent />;
  }

  if (!pdfUrl) {
    return null;
  }

  if (error) {
    return (
      <View style={[style, styles.centeredContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={style}>
      <RNPdfViewerComponent
        style={StyleSheet.absoluteFill}
        pdfDetails={{ url: pdfUrl, title: pdfTitle }}
        initialPage={initialPage || 0}
        onLoadComplete={handleLoadComplete}
        onPageChanged={handlePageChanged}
        onError={handleError}
      />
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>Loading PDF...</Text>
        </View>
      )}
      {!loading && totalPages > 0 && (
        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            {currentPage + 1} / {totalPages}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: '#4A90D9',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});

const MemoizedPdfViewer = React.memo(PdfViewer);

export default MemoizedPdfViewer;
