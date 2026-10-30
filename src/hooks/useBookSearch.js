import { useEffect, useState } from 'react';
import { searchBooks } from '../services/bookService';

// What's searched for, once it's long enough and the reader has paused
// (specs/coming-soon R1.1). An answer to a query the reader has since changed
// is dropped, so a slow early answer can't replace a later one.
//
// status: 'idle' (too short to search), 'loading', 'done', 'failed'. Failed
// covers no connection as well as a server error (R1.4); editing the query
// searches again.
export const SEARCH_MIN_LENGTH = 2;
const PAUSE_MS = 300;

const useBookSearch = (query) => {
  const q = query.trim();
  const [result, setResult] = useState({ status: 'idle', books: [], query: '' });

  useEffect(() => {
    if (q.length < SEARCH_MIN_LENGTH) {
      setResult({ status: 'idle', books: [], query: '' });
      return undefined;
    }
    let current = true;
    setResult((prev) => ({ ...prev, status: 'loading', query: q }));
    const timer = setTimeout(async () => {
      try {
        const { status, books } = await searchBooks(q);
        if (current) {
          setResult({ status: status === 200 ? 'done' : 'failed', books, query: q });
        }
      } catch {
        if (current) {
          setResult({ status: 'failed', books: [], query: q });
        }
      }
    }, PAUSE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [q]);

  return result;
};

export default useBookSearch;
