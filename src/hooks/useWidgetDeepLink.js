import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import useRoomStore from '../stores/roomStore';
import enhancedStorage from '../utils/enhancedStorage';
import findReaderBook from '../utils/readerBook';
import log from '../utils/logger';

// Taps on the widgets (WIDGET_5a_5b.md, WIDGETS_13a_13f.md):
//   readpanda://read/{bookId}?page={p}&room={roomId}
//                                         → the reader; `room` turns that
//                                           room's comment layer on (13b, 13d)
//   readpanda://room/{roomId}             → Room Detail (5b)
//   readpanda://book/{bookId}?title=…     → Book detail (13e's covers)
//   readpanda://bucket/{id}?kind=curated|user&name=…
//                                         → the bucket (13d's Up next)
//   readpanda://library                   → Discover (empty states)
//
// The reader reopens at the book's saved position, which is the page the
// widget was showing, so `page` isn't needed to get there.

const WIDGET_LINK_RE = /^readpanda:\/\/(read|room|library|book|bucket)(?:\/([^/?#]+))?\/?(?:\?([^#]*))?(?:#.*)?$/;

const parseQuery = (query) => Object.fromEntries((query || '')
  .split('&')
  .filter(Boolean)
  .map((pair) => {
    const [key, value = ''] = pair.split('=');
    return [decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' '))];
  }));

export const parseWidgetLink = (url) => {
  const match = WIDGET_LINK_RE.exec((url || '').trim());
  if (!match) {
    return null;
  }
  const [, kind, id, query] = match;
  if (kind !== 'library' && !id) {
    return null;
  }
  return { kind, id: id ? decodeURIComponent(id) : null, params: parseQuery(query) };
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
          whenReady(() => navigationRef.current?.navigate('Main', {
            screen: 'ManuscriptScreen',
            params: { book, roomId: link.params.room || null, fromWidget: true },
          }));
        }
      } else if (link.kind === 'book') {
        // Book detail renders from a seed and fetches the rest by id.
        const book = { book_id: link.id, title: link.params.title || '' };
        whenReady(() => navigationRef.current?.navigate('Main', { screen: 'BookDetail', params: { book } }));
      } else if (link.kind === 'bucket') {
        const name = link.params.name || '';
        if (link.params.kind === 'curated') {
          whenReady(() => navigationRef.current?.navigate('Main', {
            screen: 'CuratedBucket',
            params: { bucketId: link.id, name },
          }));
        } else {
          whenReady(() => navigationRef.current?.navigate('Main', {
            screen: 'Tabs',
            params: {
              screen: 'MyBooks',
              params: { screen: 'MyBucket', initial: false, params: { bucketId: link.id, name } },
            },
          }));
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
