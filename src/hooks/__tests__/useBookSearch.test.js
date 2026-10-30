// specs/coming-soon R1.1, R1.4: search once the query is long enough and the
// reader has paused; never let an older answer replace a newer one.
import { act, renderHook } from '@testing-library/react-native';

const mockSearch = jest.fn();
jest.mock('../../services/bookService', () => ({ searchBooks: (q) => mockSearch(q) }));

import useBookSearch from '../useBookSearch';

const answer = (books, status = 200) => Promise.resolve({ status, books });

beforeEach(() => {
  jest.useFakeTimers();
  mockSearch.mockReset();
});
afterEach(() => jest.useRealTimers());

const settle = async (ms) => {
  await act(async () => { jest.advanceTimersByTime(ms); });
  await act(async () => {});
};

it('does nothing under 2 characters', async () => {
  const { result } = await renderHook(() => useBookSearch(' w '));
  await settle(500);
  expect(mockSearch).not.toHaveBeenCalled();
  expect(result.current.status).toBe('idle');
});

it('searches the trimmed query once the reader pauses', async () => {
  mockSearch.mockReturnValue(answer([{ book_id: 'b1', title: 'Whale Songs' }]));
  const { result } = await renderHook(() => useBookSearch('  whale '));
  await settle(200);
  expect(mockSearch).not.toHaveBeenCalled();
  await settle(150);
  expect(mockSearch).toHaveBeenCalledWith('whale');
  expect(result.current).toMatchObject({ status: 'done', query: 'whale', books: [{ title: 'Whale Songs' }] });
});

it('only searches the last of several quick edits', async () => {
  mockSearch.mockReturnValue(answer([]));
  const { rerender } = await renderHook(({ q }) => useBookSearch(q), { initialProps: { q: 'wh' } });
  await settle(100);
  await rerender({ q: 'wha' });
  await settle(100);
  await rerender({ q: 'whale' });
  await settle(400);
  expect(mockSearch).toHaveBeenCalledTimes(1);
  expect(mockSearch).toHaveBeenCalledWith('whale');
});

it('drops a late answer to a query that has since changed', async () => {
  let finishOld;
  mockSearch
    .mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }))
    .mockReturnValueOnce(answer([{ book_id: 'new', title: 'Dune' }]));
  const { result, rerender } = await renderHook(({ q }) => useBookSearch(q), { initialProps: { q: 'whale' } });
  await settle(350);
  await rerender({ q: 'dune' });
  await settle(350);
  await act(async () => { finishOld({ status: 200, books: [{ book_id: 'old', title: 'Moby Dick' }] }); });
  expect(result.current.books.map((b) => b.book_id)).toEqual(['new']);
});

it('reports a failure, and an edit searches again', async () => {
  mockSearch.mockReturnValueOnce(answer([], 0)).mockReturnValueOnce(answer([{ book_id: 'b', title: 'Whale' }]));
  const { result, rerender } = await renderHook(({ q }) => useBookSearch(q), { initialProps: { q: 'whale' } });
  await settle(350);
  expect(result.current.status).toBe('failed');
  await rerender({ q: 'whales' });
  await settle(350);
  expect(result.current.status).toBe('done');
});
