// src/screens/ManuscriptScreen.js
import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/Ionicons';
import PdfViewer from '../components/PdfViewer';
import PickerSheet from '../components/PickerSheet';
import log from '../utils/logger';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import useRoomStore from '../stores/roomStore';
import useHighlightsStore from '../stores/highlightsStore';
import { putReadingProgress } from '../services/progressService';
import enhancedStorage from '../utils/enhancedStorage';
import { getReaderSetting } from '../utils/readerSettings';
import { showToast } from '../components/Toaster';
import { DS } from '../styles/global';

// The reader itself lives in ios/RNPdfViewer.swift — page, chrome, scrubber,
// highlights, gutter and thread sheet. What is left here is the wiring the
// native side has no business knowing: which room this book is being read in,
// where the reader got to, and the comments store behind it all.

// The room a book was last commented in. A book can sit in more than one room;
// the reader picks once and the choice sticks, rather than being asked on every
// selection.
const lastRoomKey = (bookId) => `commentRoom:${bookId}`;

// How long a page has to stay put before reading past the spoiler line
// publishes it. Long enough that dragging the scrubber or flicking through
// pages costs one request at the end rather than one per page.
const UNLOCK_SETTLE_MS = 1500;

const ManuscriptScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const saveProgress = useReadingProgressStore((s) => s.saveProgress);
  const loadProgress = useReadingProgressStore((s) => s.loadProgress);
  const shelf = useReadingProgressStore((s) => s.shelf);

  // Subscribing to the data, not only to the actions: the actions have stable
  // identities, so a screen that reads them alone never re-renders when
  // comments arrive.
  const byBook = useCommentsStore((s) => s.byBook);
  const loadComments = useCommentsStore((s) => s.loadComments);
  const addComment = useCommentsStore((s) => s.addComment);
  const retryComment = useCommentsStore((s) => s.retryComment);
  const toggleLike = useCommentsStore((s) => s.toggleLike);
  const markThreadRead = useCommentsStore((s) => s.markThreadRead);
  const rooms = useRoomStore((s) => s.rooms);
  const bookHighlights = useHighlightsStore((s) => s.byBook[book.book_id]);
  const loadHighlights = useHighlightsStore((s) => s.loadHighlights);
  const addHighlight = useHighlightsStore((s) => s.addHighlight);
  const removeHighlight = useHighlightsStore((s) => s.removeHighlight);

  // Read once per book. Re-read every render, it followed the reader's own
  // saves back into the native view, which re-navigated to whatever page had
  // last been saved — a step behind a fast reader, so the page and scrubber
  // jumped back and then forward again.
  const savedProgress = useMemo(() => loadProgress(book.book_id), [loadProgress, book.book_id]);
  const initialPage = savedProgress?.currentPage || 0;
  log.info(`ManuscriptScreen initial page for ${book.title}: ${initialPage}`);
  const [pageMode] = useState(() => getReaderSetting('pageMode'));
  // Seeded from the saved position, not 0: a save that lands before the PDF
  // reports its first page (backgrounding right after opening) must not send
  // the reader back to page one.
  const currentPageRef = useRef(initialPage);
  const totalPagesRef = useRef(savedProgress?.totalPages || 0);

  const fileHashRef = useRef('');
  const [submitting, setSubmitting] = useState(false);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);

  // The book carries no room through navigation — eight screens push this one
  // and none of them know about rooms. The shelf already stores it.
  const shelfRooms = useMemo(
    () => shelf.filter((b) => b.id === book.book_id && b.roomId).map((b) => ({ id: b.roomId, name: b.roomName })),
    [shelf, book.book_id],
  );

  useEffect(() => {
    if (roomId || shelfRooms.length === 0) {
      return;
    }
    const remembered = enhancedStorage.getUserPreference(lastRoomKey(book.book_id));
    const match = shelfRooms.find((r) => r.id === remembered);
    setRoomId(match?.id || shelfRooms[0].id);
  }, [shelfRooms, roomId, book.book_id]);

  const entry = byBook[book.book_id];
  const threads = useMemo(() => entry?.threads || [], [entry]);
  const roomName =
    shelfRooms.find((r) => r.id === roomId)?.name ||
    rooms?.find((r) => r.id === roomId)?.name ||
    '';

  log.info(`ManuscriptScreen loaded for book: ${book.title}`);

  // The last position handed to saveProgress, so leaving the foreground twice
  // (inactive, then background) doesn't write and publish the same page twice.
  const lastSavedRef = useRef(null);

  const persistPosition = useCallback(() => {
    const currentPage = currentPageRef.current;
    const totalPages = totalPagesRef.current;
    const last = lastSavedRef.current;
    if (last && last.currentPage === currentPage && last.totalPages === totalPages) {
      return;
    }
    lastSavedRef.current = { currentPage, totalPages };
    saveProgress(
      book.book_id,
      { currentPage, totalPages, lastReadAt: Date.now() },
      book,
    );
  }, [book, saveProgress]);

  useEffect(() => () => persistPosition(), [persistPosition]);

  // Unmount alone isn't enough: a reader who swipes the app away from the
  // switcher never unmounts this screen. 'inactive' is the last event iOS
  // reliably delivers before that, so save on it as well as on 'background'.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') {
        persistPosition();
      }
    });
    return () => subscription.remove();
  }, [persistPosition]);

  // Solo books have no room and therefore no conversation to fetch.
  useEffect(() => {
    if (roomId) {
      loadComments(roomId, book.book_id);
    }
  }, [roomId, book.book_id, loadComments]);

  // Highlights are the reader's own, so unlike comments they load for solo
  // books too.
  useEffect(() => {
    loadHighlights(book.book_id);
  }, [book.book_id, loadHighlights]);

  const unlockTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(unlockTimerRef.current), []);

  // The server only hands back comments up to the furthest page it knows the
  // reader has reached, and that only moves when progress is published —
  // which otherwise happens on leaving the reader. Without this, a comment
  // further on stays locked for the whole session: reach its page and there's
  // nothing there, read on past it and nothing ever says you missed it.
  //
  // So once the reader settles past the line while something is still locked
  // ahead, publish the position and ask again. The thread then arrives unread,
  // which is what lights its highlight and gutter dot, the header dot and the
  // scrubber's "waiting behind you" — wherever the reader has got to by then.
  const unlockReachedComments = useCallback(async () => {
    if (!roomId) {
      return;
    }
    const entry = useCommentsStore.getState().byBook[book.book_id];
    const page = currentPageRef.current;
    if (!entry?.lockedCount || page <= (entry.furthestPage || 0)) {
      return;
    }
    try {
      const { status, response } = await putReadingProgress(book.book_id, {
        currentPage: page,
        totalPages: totalPagesRef.current,
      });
      if (status !== 200) {
        log.error('Failed to publish progress past the spoiler line:', status);
        return;
      }
      // The save says whether the pages it carried us past held anything.
      // Usually they don't, and then there's nothing new to fetch. An API
      // that predates the count sends none — fetch, as before.
      if (response?.newly_unlocked === 0) {
        return;
      }
      await loadComments(roomId, book.book_id);
    } catch (e) {
      log.error('Failed to unlock comments the reader has reached:', e);
    }
  }, [roomId, book.book_id, loadComments]);

  // Page position is the reader's business; it comes back here so the shelf
  // knows where the book was left, and so comments unlock as pages are reached.
  const handlePageChanged = useCallback((page, total) => {
    currentPageRef.current = page;
    totalPagesRef.current = total;

    const entry = useCommentsStore.getState().byBook[book.book_id];
    if (roomId && entry?.lockedCount > 0 && page > (entry.furthestPage || 0)) {
      clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = setTimeout(unlockReachedComments, UNLOCK_SETTLE_MS);
    }
  }, [roomId, book.book_id, unlockReachedComments]);

  const handleLoadComplete = useCallback((total, hash) => {
    totalPagesRef.current = total;
    fileHashRef.current = hash || '';
  }, []);

  const handleError = useCallback((message) => {
    log.error(`PDF error for ${book.title}: ${message}`);
  }, [book.title]);

  // Threads as the native side wants them: the anchor it draws, and the
  // conversation it shows in the sheet. Solo books send none.
  const nativeThreads = useMemo(() => {
    if (!roomId) {
      return [];
    }
    return threads.map((t) => ({
      anchorKey: t.anchorKey,
      page: t.page,
      anchorText: t.anchorText,
      bounds: t.anchorBounds || [],
      unreadCount: t.unreadCount,
      fileHash: t.fileHash,
      comments: t.comments,
    }));
  }, [threads, roomId]);

  // What the native side draws. `key` stays the same from the moment a
  // highlight is made to after it's saved, so nothing flickers on save.
  const nativeHighlights = useMemo(
    () => (bookHighlights || []).map((h) => ({
      key: h.key,
      page: h.page,
      anchorText: h.anchorText,
      bounds: h.anchorBounds || [],
      fileHash: h.fileHash,
    })),
    [bookHighlights],
  );

  const handleCreateHighlight = useCallback(async ({ page, anchorText, bounds, fileHash }) => {
    try {
      await addHighlight({
        bookId: book.book_id,
        page,
        anchorText,
        anchorBounds: bounds,
        fileHash: fileHash || fileHashRef.current,
      });
    } catch {
      showToast('Couldn\'t save that highlight', 'error');
    }
  }, [book.book_id, addHighlight]);

  const handleRemoveHighlight = useCallback(async (key) => {
    try {
      await removeHighlight(book.book_id, key);
    } catch {
      showToast('Couldn\'t remove that highlight', 'error');
    }
  }, [book.book_id, removeHighlight]);

  // Opening a thread marks it read.
  const handleThreadOpened = useCallback((anchorKey) => {
    markThreadRead(book.book_id, anchorKey);
  }, [book.book_id, markThreadRead]);

  const handleSubmitComment = useCallback(async ({ page, anchorText, bounds, fileHash, parentId, body }) => {
    if (!roomId) {
      return;
    }
    setSubmitting(true);
    try {
      await addComment({
        roomId,
        bookId: book.book_id,
        page,
        anchorText,
        anchorBounds: bounds,
        parentId,
        body,
        fileHash: fileHash || fileHashRef.current,
      });
    } catch {
      // The comment is still on screen, flagged for retry — the toast just
      // says so, since the sheet has already moved on.
      showToast('Couldn\'t post that — tap retry on the comment', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [roomId, book.book_id, addComment]);

  const handleLike = useCallback((commentId) => {
    toggleLike(book.book_id, commentId);
  }, [book.book_id, toggleLike]);

  const handleRetry = useCallback((clientId) => {
    retryComment(book.book_id, clientId);
  }, [book.book_id, retryComment]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRoomPicker = useCallback(() => setRoomPickerOpen(true), []);

  // The reader is native and iOS-only, so Android gets the message — and,
  // since the chrome is native too, its own way back out.
  if (Platform.OS !== 'ios') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.fallbackBack}
          accessibilityLabel="Back"
        >
          <Icon name="chevron-back" size={26} color={DS.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.platformMessage}>
          PDF viewing is currently only supported on iOS.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <PdfViewer
        style={styles.reader}
        pdfUrl={book.manuscript_url}
        bookTitle={book.title}
        initialPage={initialPage}
        pageMode={pageMode}
        threads={nativeThreads}
        highlights={nativeHighlights}
        hasRoom={!!roomId}
        canPickRoom={shelfRooms.length > 1}
        roomName={roomName}
        unreadTotal={roomId ? entry?.unreadCount || 0 : 0}
        lockedCount={roomId ? entry?.lockedCount || 0 : 0}
        submitting={submitting}
        onPageChanged={handlePageChanged}
        onLoadComplete={handleLoadComplete}
        onError={handleError}
        onBack={handleBack}
        onThreadOpened={handleThreadOpened}
        onSubmitComment={handleSubmitComment}
        onLikeComment={handleLike}
        onRetryComment={handleRetry}
        onRoomPickerRequested={handleRoomPicker}
        onCreateHighlight={handleCreateHighlight}
        onRemoveHighlight={handleRemoveHighlight}
      />

      {/* Only asked when the book really is in more than one room. */}
      <PickerSheet
        visible={roomPickerOpen}
        title="Comment in which room?"
        subtitle="This book is being read in more than one."
        items={shelfRooms.map((r) => ({ id: r.id, title: r.name || 'Room', isBucket: true }))}
        onSelect={(item) => {
          setRoomId(item.id);
          enhancedStorage.storeUserPreference(lastRoomKey(book.book_id), item.id);
          setRoomPickerOpen(false);
        }}
        onClose={() => setRoomPickerOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  reader: {
    flex: 1,
  },
  fallbackBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 10,
  },
  platformMessage: {
    fontSize: 18,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 32,
  },
});

export default ManuscriptScreen;
