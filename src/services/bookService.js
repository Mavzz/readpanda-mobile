import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest } from './authenticatedRequests';

const fetchManuscripts = async () => {
  const { status, response } = await makeAuthenticatedGetRequest(
    getBackendUrl('/books/all'),
  );

  return { status, response };
};

// GET /books/search?q= — title or author, best match first, up to 50
// (specs/coming-soon R1.6). The catalogue's books carry `id`; the rest of the
// app (covers, Book detail) reads `book_id`, so it's given both.
const searchBooks = async (query) => {
  const { status, response } = await makeAuthenticatedGetRequest(
    getBackendUrl(`/books/search?q=${encodeURIComponent(query)}`),
  );
  if (status !== 200) {
    return { status, books: [] };
  }
  const books = (response?.books || []).map((book) => ({ ...book, book_id: book.book_id || book.id }));
  return { status, books };
};

export { fetchManuscripts, searchBooks };
