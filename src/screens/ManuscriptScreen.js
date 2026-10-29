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
import { isOnline } from '../stores/connectivityStore';
import enhancedStorage from '../utils/enhancedStorage';
import { getReaderSetting } from '../utils/readerSettings';
import useLayout from '../hooks/useLayout';
import { showToast } from '../components/Toaster';
import useSafetyActions from '../hooks/useSafetyActions';
import { bodyOfError } from '../utils/apiError';
import { sameId } from '../utils/bookId';
import { DS } from '../styles/global';
import WidgetOpenMorph from '../widget/WidgetOpenMorph';

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

// A page turned forward after this long counts toward the reader's pace (the
// widgets' "3 h left"). Quicker is skimming or scrubbing; slower is the phone
// left on the nightstand.
const PACE_MIN_SECONDS = 5;
const PACE_MAX_SECONDS = 10 * 60;

const ManuscriptScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const saveProgress = useReadingProgressStore((s) => s.saveProgress);
  const loadProgress = useReadingProgressStore((s) => s.loadProgress);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const attachRoom = useReadingProgressStore((s) => s.attachRoom);

  // Subscribing to the data, not only to the actions: the actions have stable
  // identities, so a screen that reads them alone never re-renders when
  // comments arrive.
  const byBook = useCommentsStore((s) => s.byBook);
  const loadComments = useCommentsStore((s) => s.loadComments);
  const addComment = useCommentsStore((s) => s.addComment);
  const retryComment = useCommentsStore((s) => s.retryComment);
  const toggleLike = useCommentsStore((s) => s.toggleLike);
  const markThreadRead = useCommentsStore((s) => s.markThreadRead);
  const discardFailed = useCommentsStore((s) => s.discardFailed);
  const { reportComment, blockUser, confirmDelete } = useSafetyActions();
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
  // iPad layouts scroll with pages fit to the window (14f). Spread was tried
  // and dropped: two fixed PDF pages side by side made the text too small.
  const { isLarge } = useLayout();
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
  // The shelf can miss a room: one joined, or whose book was chosen, before
  // the book was on this device's shelf has nothing to tag, and Book detail
  // then starts it solo. My rooms reading it still count.
  const roomsReadingIt = useMemo(
    () => (rooms || []).filter((r) => sameId(r.currentBookId, book.book_id)),
    [rooms, book.book_id],
  );
  const bookRooms = useMemo(
    () => (shelfRooms.length ? shelfRooms : roomsReadingIt.map((r) => ({ id: r.id, name: r.name }))),
    [shelfRooms, roomsReadingIt],
  );

  useEffect(() => {
    if (roomId || bookRooms.length === 0) {
      return;
    }
    // A widget tap asks for a particular room's layer (WIDGETS_13a_13f.md).
    const requested = route.params?.roomId;
    const remembered = enhancedStorage.getUserPreference(lastRoomKey(book.book_id));
    const match = bookRooms.find((r) => r.id === requested) || bookRooms.find((r) => r.id === remembered);
    const chosen = match?.id || bookRooms[0].id;
    setRoomId(chosen);
    if (!shelfRooms.length) {
      // So Home and My Books show it with the room too.
      attachRoom(roomsReadingIt.find((r) => r.id === chosen));
    }
  }, [bookRooms, shelfRooms, roomsReadingIt, roomId, book.book_id, route.params?.roomId, attachRoom]);

  const entry = byBook[book.book_id];
  const threads = useMemo(() => entry?.threads || [], [entry]);
  const roomName =
    bookRooms.find((r) => r.id === roomId)?.name ||
    rooms?.find((r) => r.id === roomId)?.name ||
    '';

  log.info(`ManuscriptScreen loaded for book: ${book.title}`);

  // The last position handed to saveProgress, so leaving the foreground twice
  // (inactive, then background) doesn't write and publish the same page twice.
  const lastSavedRef = useRef(null);

  // The last page turn, and the reading time not yet written to storage.
  const lastTurnRef = useRef(null);
  const paceRef = useRef({ seconds: 0, pages: 0 });

  const persistPosition = useCallback(() => {
    const pace = paceRef.current;
    if (pace.pages > 0) {
      enhancedStorage.recordReadingPace(pace.seconds, pace.pages);
      paceRef.current = { seconds: 0, pages: 0 };
    }
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
    // Offline the outbox carries this page, and reloads the comments it
    // unlocks once it's sent (specs/offline-first R4.4).
    if (!isOnline()) {
      return;
    }
    try {
      const { status, response } = await putReadingProgress(book.book_id, {
        currentPage: page,
        totalPages: totalPagesRef.current,
      }, { quiet: true });
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

    const now = Date.now();
    const last = lastTurnRef.current;
    if (last && page === last.page + 1) {
      const seconds = (now - last.at) / 1000;
      if (seconds >= PACE_MIN_SECONDS && seconds <= PACE_MAX_SECONDS) {
        paceRef.current = { seconds: paceRef.current.seconds + seconds, pages: paceRef.current.pages + 1 };
      }
    }
    lastTurnRef.current = { page, at: now };

    const entry = useCommentsStore.getState().byBook[book.book_id];
    if (roomId && entry?.lockedCount > 0 && page > (entry.furthestPage || 0)) {
      clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = setTimeout(unlockReachedComments, UNLOCK_SETTLE_MS);
    }
  }, [roomId, book.book_id, unlockReachedComments]);

  const handleLoadComplete = useCallback((total, hash, chapters) => {
    totalPagesRef.current = total;
    fileHashRef.current = hash || '';
    enhancedStorage.setBookChapters(book.book_id, chapters);
  }, [book.book_id]);

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
    } catch (e) {
      // The comment is still on screen, flagged — the toast just says so,
      // since the sheet has already moved on. One refused for its words
      // offers Edit rather than Retry (report-block R8.3).
      const refused = bodyOfError(e).code === 'blocked_words';
      showToast(
        refused ? 'That includes words we don\'t allow.' : 'Couldn\'t post that — tap retry on the comment',
        'error',
      );
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

  // A comment's ⋯ menu, or Edit on a refused one (report-block). The sheet
  // only knows ids, so find the comment it means.
  const handleManageComment = useCallback(({ action, commentId, clientId, userId, username }) => {
    if (action === 'discard') {
      discardFailed(book.book_id, clientId);
      return;
    }
    const all = threads.flatMap((t) => t.comments.flatMap((c) => [c, ...(c.replies || [])]));
    const comment = all.find((c) => c.id === commentId);
    if (!comment) {
      return;
    }
    if (action === 'delete') {
      confirmDelete(comment, book.book_id);
    } else if (action === 'report') {
      reportComment(comment, { bookId: book.book_id, roomId });
    } else if (action === 'block') {
      blockUser({ userId: userId || comment.userId, username: username || comment.username });
    }
  }, [threads, book.book_id, roomId, discardFailed, confirmDelete, reportComment, blockUser]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  // On iPad the picker is a popover off the reader's comment button (15n);
  // the native view sends that button's frame with the request.
  const [roomPickerAnchor, setRoomPickerAnchor] = useState(null);
  const handleRoomPicker = useCallback((anchor) => {
    setRoomPickerAnchor(anchor);
    setRoomPickerOpen(true);
  }, []);

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
        largeLayout={isLarge}
        threads={nativeThreads}
        highlights={nativeHighlights}
        hasRoom={!!roomId}
        canPickRoom={bookRooms.length > 1}
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
        onManageComment={handleManageComment}
        onRoomPickerRequested={handleRoomPicker}
        onCreateHighlight={handleCreateHighlight}
        onRemoveHighlight={handleRemoveHighlight}
      />
      {route.params?.fromWidget ? <WidgetOpenMorph book={book} /> : null}

      {/* Only asked when the book really is in more than one room. */}
      <PickerSheet
        anchorRect={roomPickerAnchor}
        visible={roomPickerOpen}
        title="Comment in which room?"
        subtitle="This book is being read in more than one."
        items={bookRooms.map((r) => ({ id: r.id, title: r.name || 'Room', isBucket: true }))}
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
