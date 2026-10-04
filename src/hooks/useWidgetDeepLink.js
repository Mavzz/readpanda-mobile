import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import useRoomStore from '../stores/roomStore';
import enhancedStorage from '../utils/enhancedStorage';
import findReaderBook from '../utils/readerBook';
import log from '../utils/logger';

// Taps on the home-screen widget (WIDGET_5a_5b.md). The whole widget is one
// link:
//   readpanda://read/{bookId}?page={p}  → the reader (5a)
//   readpanda://room/{roomId}           → Room Detail (5b)
//   readpanda://library                 → Discover (empty state, 3a)
//
// The reader reopens at the book's saved position, which is the page the
// widget was showing, so `page` isn't needed to get there.

const WIDGET_LINK_RE = /^readpanda:\/\/(read|room|library)(?:\/([^/?#]+))?\/?(?:[?#].*)?$/;

export const parseWidgetLink = (url) => {
  const match = WIDGET_LINK_RE.exec((url || '').trim());
  if (!match) {
    return null;
  }
  const [, kind, id] = match;
  if (kind !== 'library' && !id) {
    return null;
  }
  return { kind, id: id ? decodeURIComponent(id) : null };
};

// The reader needs the book's manuscript URL. The stored reading position has
// it and works offline; the books list is the fallback.
const bookFor = async (bookId) => {
  const stored = enhancedStorage.getReadingPosition(bookId)?.book;
  if (stored?.manuscript_url) {
    return stored;
  }
  return findReaderBook(bookId);
};

const useWidgetDeepLink = ({ isAuthenticated, navigationRef }) => {
  // A tap that launched the app before sign-in, run once signed in.
  const pending = useRef(null);

  useEffect(() => {
    // On a cold start the link can arrive before the navigator has mounted.
    const whenReady = (fn, attempts = 20) => {
      if (navigationRef.isReady?.()) {
        fn();
      } else if (attempts > 0) {
        setTimeout(() => whenReady(fn, attempts - 1), 250);
      }
    };

    const open = async (link) => {
      if (!isAuthenticated) {
        pending.current = link;
        return;
      }
      log.info('Opening widget link:', link.kind, link.id);

      if (link.kind === 'read') {
        const book = await bookFor(link.id);
        if (book) {
          whenReady(() => navigationRef.current?.navigate('Main', { screen: 'ManuscriptScreen', params: { book } }));
        }
      } else if (link.kind === 'room') {
        // RoomLobbyScreen fetches the full detail from the id.
        const room = useRoomStore.getState().rooms.find((r) => r.id === link.id) || { id: link.id };
        whenReady(() => navigationRef.current?.navigate('Main', { screen: 'RoomLobbyScreen', params: { room } }));
      } else {
        whenReady(() => navigationRef.current?.navigate('Main', {
          screen: 'Tabs',
          params: { screen: 'Discover' },
        }));
      }
    };

    const handleUrl = (url) => {
      const link = parseWidgetLink(url);
      if (link) {
        open(link);
      }
    };

    Linking.getInitialURL()
      .then(handleUrl)
      .catch((e) => log.error('Failed to read initial URL:', e));
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    if (isAuthenticated && pending.current) {
      const link = pending.current;
      pending.current = null;
      open(link);
    }

    return () => subscription.remove();
  }, [isAuthenticated, navigationRef]);
};

export default useWidgetDeepLink;
