import useBooksStore from '../stores/booksStore';

// The manuscripts list uses `id`; the reader keys everything on `book_id`.
const toReaderBook = (book) => ({
  book_id: book.book_id ?? book.id,
  title: book.title,
  cover_image_url: book.cover_image_url || null,
  manuscript_url: book.manuscript_url || null,
});

// ManuscriptScreen needs the whole book (title, manuscript_url), but a
// notification or a push only carries its id — look it up in the library,
// fetching the library if it isn't loaded yet. Null if it isn't there.
const findReaderBook = async (bookId) => {
  if (!bookId) {
    return null;
  }
  const matches = (b) => String(b.book_id ?? b.id) === String(bookId);
  let book = useBooksStore.getState().books.find(matches);
  if (!book) {
    await useBooksStore.getState().fetchBooks();
    book = useBooksStore.getState().books.find(matches);
  }
  return book ? toReaderBook(book) : null;
};

export default findReaderBook;
