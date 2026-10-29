import React, { useCallback, useEffect } from 'react';
import { requireNativeComponent, Platform } from 'react-native';
import log from '../utils/logger';
import { raiseOfflinePill } from './OfflinePill';

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
  largeLayout,
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
  onManageComment,
  onRoomPickerRequested,
  onCreateHighlight,
  onRemoveHighlight,
}) => {
  useEffect(() => {
    log.info(`PdfViewer initialPage for ${bookTitle}: ${initialPage} (sent to native: ${initialPage || 0})`);
  }, [bookTitle, initialPage]);

  const handlePageChanged = useCallback((e) => {
    const { currentPage, totalPages } = e.nativeEvent;
    onPageChanged?.(currentPage, totalPages);
  }, [onPageChanged]);

  const handleLoadComplete = useCallback((e) => {
    const { totalPages, fileHash, chapters } = e.nativeEvent;
    log.info(`PDF loaded: ${bookTitle} — ${totalPages} pages, ${chapters?.length || 0} chapters`);
    onLoadComplete?.(totalPages, fileHash, chapters || []);
  }, [bookTitle, onLoadComplete]);

  const handleError = useCallback((e) => {
    const { message, offline } = e.nativeEvent;
    // Not downloaded and no connection is a state the reader shows and
    // recovers from on its own (specs/offline-first R7), not an error.
    if (offline) {
      log.info(`PDF waiting for a connection: ${bookTitle}`);
      return;
    }
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

  // The comment sheet and its composer fill the bottom, where the Offline
  // pill sits: while it's open the pill moves up under the reader's header
  // (specs/offline-first R2.1). Back down when the reader goes.
  const handleCommentSheetChange = useCallback((e) => {
    raiseOfflinePill(!!e.nativeEvent.open);
  }, []);
  useEffect(() => () => raiseOfflinePill(false), []);

  // { action: 'delete' | 'report' | 'block' | 'discard', commentId, clientId,
  // userId, username } from a comment's ⋯ menu or a refused comment's Edit.
  const handleManageComment = useCallback((e) => {
    onManageComment?.(e.nativeEvent);
  }, [onManageComment]);

  // Carries the comment button's window frame ({ x, y, width, height }) so
  // iPad can anchor the room popover to it.
  const handleRoomPickerRequested = useCallback((e) => {
    const { x, y, width, height } = e.nativeEvent || {};
    onRoomPickerRequested?.(width ? { x, y, w: width, h: height } : null);
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
      largeLayout={!!largeLayout}
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
      onCommentSheetChange={handleCommentSheetChange}
      onManageComment={handleManageComment}
      onRoomPickerRequested={handleRoomPickerRequested}
      onCreateHighlight={handleCreateHighlight}
      onRemoveHighlight={handleRemoveHighlight}
    />
  );
};

export default React.memo(PdfViewer);
