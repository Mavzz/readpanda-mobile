// Downloading the shelf, and every bucket's page and covers, on Wi-Fi
// (specs/offline-first R6.1–R6.3, R6.5, R6.6).

jest.mock('../../services/progressService', () => ({ fetchMyProgress: jest.fn() }));

jest.mock('../../stores/bucketsStore', () => {
  const { create } = require('zustand');
  return { __esModule: true, default: create(() => ({})) };
});

import { Image, NativeModules } from 'react-native';
import { fetchMyProgress } from '../../services/progressService';
import useConnectivityStore from '../../stores/connectivityStore';
import useBucketsStore from '../../stores/bucketsStore';

NativeModules.ManuscriptStore = { isCached: jest.fn(), prefetch: jest.fn() };
const { prefetchShelf, resetPrefetch } = require('../useShelfPrefetch');
const { ManuscriptStore } = NativeModules;

const shelf = (n) => ({
  status: 200,
  // As GET /progress answers: the book, URL and all, nested in each row.
  response: Array.from({ length: n }, (_, i) => ({
    book_id: `b${i}`,
    book: { book_id: `b${i}`, manuscript_url: `https://cdn/b${i}.pdf?sig=${i}` },
  })),
});

const page = (...covers) => ({ status: 200, response: { books: covers.map((c) => ({ cover_image_url: c })) } });

beforeEach(() => {
  resetPrefetch();
  useBucketsStore.setState({
    curatedBuckets: [],
    customBuckets: [],
    fetchCuratedBuckets: jest.fn(async () => ({ status: 200 })),
    fetchCustomBuckets: jest.fn(async () => ({ status: 200 })),
    fetchCuratedBucketBooks: jest.fn(),
    fetchBucketBooks: jest.fn(),
  });
  Image.prefetch = jest.fn(async () => true);
  useConnectivityStore.setState({ online: true, wifi: true, expensive: false });
  ManuscriptStore.isCached.mockResolvedValue(false);
  ManuscriptStore.prefetch.mockResolvedValue(true);
});

it('fetches the 10 most recent books not already here, one at a time', async () => {
  fetchMyProgress.mockResolvedValue(shelf(14));
  ManuscriptStore.isCached.mockImplementation(async (url) => url.includes('/b2.pdf'));
  await prefetchShelf();
  const fetched = ManuscriptStore.prefetch.mock.calls.map(([url]) => url.match(/b\d+/)[0]);
  expect(fetched).toEqual(['b0', 'b1', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9']);
});

it.each([
  ['on cellular', { wifi: false }],
  ['in an expensive connection', { expensive: true }],
  ['offline', { online: false }],
])('does nothing %s', async (_, state) => {
  useConnectivityStore.setState(state);
  await prefetchShelf();
  expect(fetchMyProgress).not.toHaveBeenCalled();
});

it('stops when Wi-Fi drops mid-way', async () => {
  fetchMyProgress.mockResolvedValue(shelf(5));
  ManuscriptStore.prefetch.mockImplementation(async () => {
    useConnectivityStore.setState({ wifi: false });
    return true;
  });
  await prefetchShelf();
  expect(ManuscriptStore.prefetch).toHaveBeenCalledTimes(1);
});

it('doesn\'t ask again straight after a run', async () => {
  fetchMyProgress.mockResolvedValue(shelf(1));
  await prefetchShelf();
  await prefetchShelf();
  expect(fetchMyProgress).toHaveBeenCalledTimes(1);
});

describe('buckets (R6.5, R6.6)', () => {
  beforeEach(() => fetchMyProgress.mockResolvedValue(shelf(0)));

  it('loads every curated and own bucket page, then their covers once each', async () => {
    const buckets = useBucketsStore.getState();
    useBucketsStore.setState({
      curatedBuckets: [{ id: 'cb_1', coverImageUrl: 'https://img/hero' }],
      customBuckets: [{ id: 'ub_1' }],
    });
    buckets.fetchCuratedBucketBooks.mockResolvedValue(page('https://img/a', 'https://img/b'));
    buckets.fetchBucketBooks.mockResolvedValue(page('https://img/b', 'https://img/c'));
    await prefetchShelf();

    expect(buckets.fetchCuratedBucketBooks).toHaveBeenCalledWith('cb_1');
    expect(buckets.fetchBucketBooks).toHaveBeenCalledWith('ub_1');
    expect(buckets.fetchCuratedBuckets).not.toHaveBeenCalled();
    expect(Image.prefetch.mock.calls.map(([url]) => url).sort())
      .toEqual(['https://img/a', 'https://img/b', 'https://img/c', 'https://img/hero']);
  });

  it('asks for the bucket lists first when it has none', async () => {
    await prefetchShelf();
    expect(useBucketsStore.getState().fetchCuratedBuckets).toHaveBeenCalled();
    expect(useBucketsStore.getState().fetchCustomBuckets).toHaveBeenCalled();
  });

  it('downloads at most 200 covers, and stops when Wi-Fi drops', async () => {
    const covers = Array.from({ length: 250 }, (_, i) => `https://img/${i}`);
    useBucketsStore.setState({ curatedBuckets: [{ id: 'cb_1' }] });
    useBucketsStore.getState().fetchCuratedBucketBooks.mockResolvedValue(page(...covers));
    await prefetchShelf();
    expect(Image.prefetch).toHaveBeenCalledTimes(200);

    resetPrefetch();
    Image.prefetch.mockClear();
    Image.prefetch.mockImplementation(async () => {
      useConnectivityStore.setState({ wifi: false });
      return true;
    });
    await prefetchShelf();
    expect(Image.prefetch).toHaveBeenCalledTimes(1);
  });

  it('a cover that fails doesn\'t stop the rest', async () => {
    useBucketsStore.setState({ curatedBuckets: [{ id: 'cb_1' }] });
    useBucketsStore.getState().fetchCuratedBucketBooks.mockResolvedValue(page('https://img/a', 'https://img/b'));
    Image.prefetch.mockRejectedValueOnce(new Error('404'));
    await prefetchShelf();
    expect(Image.prefetch).toHaveBeenCalledTimes(2);
  });
});
