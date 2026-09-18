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
import { DS } from '../styles/global';

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

// The passage a comment can be anchored to is capped to the same length the
// API accepts, so a runaway drag can't produce a write the server truncates.
const MAX_ANCHOR_LENGTH = 1000;

const PdfViewer = ({
  pdfUrl,
  pdfTitle,
  style,
  initialPage,
  onPageChanged,
  onLoadComplete,
  onError,
  comments,
  clearSelectionToken,
  scrollToAnchorKey,
  onCommentRequested,
  onThreadOpen,
  onSelectionChanged,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Page position lives on the screen that owns the scrubber, not here — this
  // component is just the page now.
  const handleLoadComplete = useCallback((event) => {
    const { totalPages: pages, fileHash } = event.nativeEvent;
    log.info(`PDF loaded: ${pdfTitle} (${pages} pages)`);
    setLoading(false);
    setError(null);
    onLoadComplete?.(pages, fileHash);
  }, [pdfTitle, onLoadComplete]);

  const handleCommentRequested = useCallback((event) => {
    const { page, text, bounds, fileHash } = event.nativeEvent;
    onCommentRequested?.({
      page,
      text: (text || '').slice(0, MAX_ANCHOR_LENGTH),
      bounds,
      fileHash,
    });
  }, [onCommentRequested]);

  const handleThreadOpen = useCallback((event) => {
    onThreadOpen?.(event.nativeEvent.anchorKey);
  }, [onThreadOpen]);

  // One clear signal for "there is a selection" / "there isn't", rather than
  // making every caller unpack the native payload.
  const handleSelectionChanged = useCallback((event) => {
    const { hasSelection, text, page } = event.nativeEvent;
    onSelectionChanged?.(
      hasSelection ? { text: (text || '').slice(0, MAX_ANCHOR_LENGTH), page } : null,
    );
  }, [onSelectionChanged]);

  const handlePageChanged = useCallback((event) => {
    const { currentPage: page, totalPages: pages } = event.nativeEvent;
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
        comments={comments || []}
        clearSelectionToken={clearSelectionToken || 0}
        scrollToAnchorKey={scrollToAnchorKey || ''}
        onLoadComplete={handleLoadComplete}
        onPageChanged={handlePageChanged}
        onError={handleError}
        onCommentRequested={handleCommentRequested}
        onThreadOpen={handleThreadOpen}
        onSelectionChanged={handleSelectionChanged}
      />
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={DS.colors.primary} />
          <Text style={styles.loadingText}>Loading PDF...</Text>
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
    backgroundColor: DS.colors.background + 'D9', // surface @ 85% — was light-mode white
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: DS.colors.error,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: DS.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: DS.radius.full,
  },
  retryText: {
    color: DS.colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

const MemoizedPdfViewer = React.memo(PdfViewer);

export default MemoizedPdfViewer;
