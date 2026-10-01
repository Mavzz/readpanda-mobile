import React, { useCallback } from 'react';
import { requireNativeComponent, Platform } from 'react-native';
import log from '../utils/logger';

// The reader is native (ios/RNPdfViewer.swift): the page, the chrome around
// it, the passage highlights, the gutter, the scrubber and the thread sheet
// are all drawn there. What is left here is the bridge — props down, events
// unwrapped on the way back up — so nothing downstream has to know the shape
// of a `nativeEvent`.
//
// The name 'RNPdfViewer' must exactly match the RCT_EXTERN_MODULE name in
// RNPdfViewer.m.
const RNPdfViewerComponent = Platform.OS === 'ios' ? requireNativeComponent('RNPdfViewer') : null;

const PdfViewer = ({
  style,
  pdfUrl,
  bookTitle,
  initialPage,
  pageMode,
  threads,
  highlights,
  hasRoom,
  canPickRoom,
  roomName,
  unreadTotal,
  lockedCount,
  submitting,
  openThreadKey,
  onPageChanged,
  onLoadComplete,
  onError,
  onBack,
  onSearch,
  onThreadOpened,
  onSubmitComment,
  onLikeComment,
  onRetryComment,
  onRoomPickerRequested,
  onCreateHighlight,
  onRemoveHighlight,
}) => {
  const handlePageChanged = useCallback((e) => {
    const { currentPage, totalPages } = e.nativeEvent;
    onPageChanged?.(currentPage, totalPages);
  }, [onPageChanged]);

  const handleLoadComplete = useCallback((e) => {
    const { totalPages, fileHash } = e.nativeEvent;
    log.info(`PDF loaded: ${bookTitle} — ${totalPages} pages`);
    onLoadComplete?.(totalPages, fileHash);
  }, [bookTitle, onLoadComplete]);

  const handleError = useCallback((e) => {
    const { message } = e.nativeEvent;
    log.error(`PDF error for ${bookTitle}: ${message}`);
    onError?.(message);
  }, [bookTitle, onError]);

  const handleBack = useCallback(() => onBack?.(), [onBack]);
  const handleSearch = useCallback(() => onSearch?.(), [onSearch]);

  const handleThreadOpened = useCallback((e) => {
    onThreadOpened?.(e.nativeEvent.anchorKey);
  }, [onThreadOpened]);

  const handleSubmitComment = useCallback((e) => {
    const { page, anchorText, bounds, fileHash, parentId, body } = e.nativeEvent;
    onSubmitComment?.({ page, anchorText, bounds, fileHash, parentId: parentId || null, body });
  }, [onSubmitComment]);

  const handleLikeComment = useCallback((e) => {
    onLikeComment?.(e.nativeEvent.commentId);
  }, [onLikeComment]);

  const handleRetryComment = useCallback((e) => {
    onRetryComment?.(e.nativeEvent.clientId);
  }, [onRetryComment]);

  const handleRoomPickerRequested = useCallback(() => {
    onRoomPickerRequested?.();
  }, [onRoomPickerRequested]);

  const handleCreateHighlight = useCallback((e) => {
    const { page, anchorText, bounds, fileHash } = e.nativeEvent;
    onCreateHighlight?.({ page, anchorText, bounds, fileHash });
  }, [onCreateHighlight]);

  const handleRemoveHighlight = useCallback((e) => {
    onRemoveHighlight?.(e.nativeEvent.key);
  }, [onRemoveHighlight]);

  // Android has no reader yet; ManuscriptScreen shows its own message there.
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <RNPdfViewerComponent
      style={style}
      pdfDetails={{ url: pdfUrl || '' }}
      bookTitle={bookTitle || ''}
      initialPage={initialPage || 0}
      pageMode={pageMode || 'scroll'}
      threads={threads || []}
      highlights={highlights || []}
      hasRoom={!!hasRoom}
      canPickRoom={!!canPickRoom}
      roomName={roomName || ''}
      unreadTotal={unreadTotal || 0}
      lockedCount={lockedCount || 0}
      submitting={!!submitting}
      openThreadKey={openThreadKey || ''}
      onPageChanged={handlePageChanged}
      onLoadComplete={handleLoadComplete}
      onError={handleError}
      onBack={handleBack}
      onSearch={handleSearch}
      onThreadOpened={handleThreadOpened}
      onSubmitComment={handleSubmitComment}
      onLikeComment={handleLikeComment}
      onRetryComment={handleRetryComment}
      onRoomPickerRequested={handleRoomPickerRequested}
      onCreateHighlight={handleCreateHighlight}
      onRemoveHighlight={handleRemoveHighlight}
    />
  );
};

export default React.memo(PdfViewer);
