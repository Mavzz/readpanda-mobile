// src/screens/ManuscriptScreen.js
import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/Ionicons';
import PdfViewer from '../components/PdfViewer';
import CommentThreadSheet from '../components/CommentThreadSheet';
import PickerSheet from '../components/PickerSheet';
import ReaderScrubber from '../components/ReaderScrubber';
import log from '../utils/logger';
import useReadingProgressStore from '../stores/readingProgressStore';
import useCommentsStore from '../stores/commentsStore';
import useRoomStore from '../stores/roomStore';
import enhanceedStorage from '../utils/enhanceedStorage';
import { showToast } from '../components/Toaster';
import { DS } from '../styles/global';

// The room a book was last commented in. A book can sit in more than one room;
// the reader picks once and the choice sticks, rather than being asked on every
// selection.
const lastRoomKey = (bookId) => `commentRoom:${bookId}`;

const ManuscriptScreen = ({ route, navigation }) => {
  const { book } = route.params;
  const pdfUrl = book.manuscript_url;
  const setCurrentBook = useReadingProgressStore((s) => s.setCurrentBook);
  const addToRecentBooks = useReadingProgressStore((s) => s.addToRecentBooks);
  const saveProgress = useReadingProgressStore((s) => s.saveProgress);
  const loadProgress = useReadingProgressStore((s) => s.loadProgress);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const insets = useSafeAreaInsets();

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

  const currentPageRef = useRef(0);
  const totalPagesRef = useRef(0);
  const savedProgress = loadProgress(book.book_id);
  const initialPage = savedProgress?.currentPage || 0;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [fileHash, setFileHash] = useState('');
  const [clearToken, setClearToken] = useState(0);
  const [scrollToKey, setScrollToKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sheet, setSheet] = useState(null);
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
    const remembered = enhanceedStorage.getUserPreference(lastRoomKey(book.book_id));
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

  // Solo books have no room and therefore no conversation to fetch.
  useEffect(() => {
    if (roomId) {
      loadComments(roomId, book.book_id);
    }
  }, [roomId, book.book_id, loadComments]);

  const handlePageChanged = useCallback((page, total) => {
    currentPageRef.current = page;
    totalPagesRef.current = total;
    setCurrentPage(page);
    setTotalPages(total);
  }, []);

  const handleLoadComplete = useCallback((total, hash) => {
    totalPagesRef.current = total;
    setTotalPages(total);
    setFileHash(hash || '');
    log.info(`PDF loaded: ${book.title} — ${total} pages`);
  }, [book.title]);

  const handleError = useCallback((message) => {
    log.error(`PDF error for ${book.title}: ${message}`);
  }, [book.title]);

  // What the native side draws: one entry per thread, carrying only what the
  // page needs to place a highlight and a dot.
  const nativeThreads = useMemo(
    () =>
      threads.map((t) => ({
        anchorKey: t.anchorKey,
        page: t.page,
        text: t.anchorText,
        bounds: t.anchorBounds,
        unreadCount: t.unreadCount,
        fileHash: t.fileHash,
      })),
    [threads],
  );

  const commentPages = useMemo(() => [...new Set(threads.map((t) => t.page))], [threads]);

  // Drops the passage highlight the reader made. Leaving it selected under a
  // dismissed sheet reads as a bug.
  const clearSelection = () => {
    setClearToken((t) => t + 1);
  };

  // "Comment" from the selection menu — a new thread on that passage.
  const handleCommentRequested = useCallback((sel) => {
    if (!roomId) {
      return;
    }
    setSheet({
      mode: 'new',
      page: sel.page,
      quote: sel.text,
      bounds: sel.bounds,
      fileHash: sel.fileHash,
    });
  }, [roomId]);

  // A gutter dot — the thread anchored there. Opening it marks it read.
  const handleThreadOpen = useCallback((anchorKey) => {
    const thread = threads.find((t) => t.anchorKey === anchorKey);
    if (!thread) {
      return;
    }
    setSheet({ mode: 'thread', anchorKey });
    setScrollToKey(anchorKey);
    markThreadRead(book.book_id, anchorKey);
  }, [threads, book.book_id, markThreadRead]);

  // The chrome icon — a page-level thread, no quote block.
  const handlePageComment = () => {
    if (!roomId) {
      return;
    }
    const existing = threads.find((t) => t.page === currentPage && !t.anchorText);
    if (existing) {
      handleThreadOpen(existing.anchorKey);
      return;
    }
    setSheet({ mode: 'new', page: currentPage, quote: '', bounds: null, fileHash });
  };

  const activeThread = sheet?.mode === 'thread'
    ? threads.find((t) => t.anchorKey === sheet.anchorKey)
    : null;

  const handleSubmit = async ({ body, parentId }) => {
    setSubmitting(true);
    try {
      await addComment({
        roomId,
        bookId: book.book_id,
        page: activeThread?.page ?? sheet?.page ?? currentPage,
        anchorText: activeThread?.anchorText ?? sheet?.quote ?? '',
        anchorBounds: activeThread?.anchorBounds ?? sheet?.bounds ?? null,
        parentId,
        body,
        fileHash: activeThread?.fileHash || sheet?.fileHash || fileHash,
      });
      clearSelection();
    } catch {
      // The comment is still on screen, flagged for retry — the toast just
      // says so, since the sheet has already closed over it.
      showToast('Couldn\'t post that — tap retry on the comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSheet = () => {
    setSheet(null);
    setScrollToKey('');
    clearSelection();
  };

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
        comments={roomId ? nativeThreads : []}
        clearSelectionToken={clearToken}
        scrollToAnchorKey={scrollToKey}
        onPageChanged={handlePageChanged}
        onLoadComplete={handleLoadComplete}
        onError={handleError}
        onCommentRequested={handleCommentRequested}
        onThreadOpen={handleThreadOpen}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityLabel="Back"
        >
          <Icon name="chevron-back" size={26} color={DS.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{book.title}</Text>

        {/* Solo reading has no audience, so it gets none of this chrome. */}
        {roomId ? (
          <TouchableOpacity
            onPress={handlePageComment}
            onLongPress={() => shelfRooms.length > 1 && setRoomPickerOpen(true)}
            style={styles.iconButton}
            accessibilityLabel="Comment on this page"
          >
            <Icon name="chatbubble-ellipses-outline" size={22} color={DS.colors.primary} />
            {(entry?.unreadCount || 0) > 0 && <View style={styles.chromeDot} />}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.iconButton} accessibilityLabel="Search">
          <Icon name="search" size={21} color={DS.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Below the page, not over it — the design puts the scrubber on the
          chrome so nothing covers the words. */}
      {pdfUrl && Platform.OS === 'ios' && totalPages > 0 && (
        <ReaderScrubber
          style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }}
          currentPage={currentPage}
          totalPages={totalPages}
          commentPages={roomId ? commentPages : []}
          waitingCount={roomId ? entry?.unreadCount || 0 : 0}
          lockedCount={roomId ? entry?.lockedCount || 0 : 0}
        />
      )}

      <CommentThreadSheet
        visible={!!sheet}
        thread={activeThread}
        roomName={roomName}
        quote={sheet?.mode === 'new' ? sheet.quote : undefined}
        page={sheet?.mode === 'new' ? sheet.page : undefined}
        submitting={submitting}
        onSubmit={handleSubmit}
        onLike={(c) => toggleLike(book.book_id, c.id)}
        onRetry={(c) => retryComment(book.book_id, c.clientId)}
        onClose={handleCloseSheet}
      />

      {/* Only asked when the book really is in more than one room. */}
      <PickerSheet
        visible={roomPickerOpen}
        title="Comment in which room?"
        subtitle="This book is being read in more than one."
        items={shelfRooms.map((r) => ({ id: r.id, title: r.name || 'Room', isBucket: true }))}
        onSelect={(item) => {
          setRoomId(item.id);
          enhanceedStorage.storeUserPreference(lastRoomKey(book.book_id), item.id);
          setRoomPickerOpen(false);
        }}
        onClose={() => setRoomPickerOpen(false)}
      />
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
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chromeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: DS.colors.primary,
  },
  headerTitle: {
    flex: 1,
    fontFamily: DS.font.bold,
    fontSize: 17,
    color: DS.colors.onSurface,
    marginLeft: 4,
  },
  // The page is a card on the chrome, not full-bleed — it's what separates
  // the manuscript from the app's own furniture above and below it.
  content: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: DS.radius.sm,
    overflow: 'hidden',
  },
  pdf: {
    flex: 1,
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
