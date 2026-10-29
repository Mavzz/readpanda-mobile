// Highlights offline (specs/offline-first R3.1, R3.4, R3.6, R3.10, R4.1, R4.2).

jest.mock('../../utils/enhancedStorage', () => {
  const saved = {};
  return {
    __esModule: true,
    default: {
      getUserProfile: () => ({ username: 'ada' }),
      readCache: (name) => saved[name] || null,
      writeCache: (name, value) => { saved[name] = value; },
      __saved: saved,
    },
  };
});
jest.mock('../../services/highlightsService', () => ({
  fetchBookHighlights: jest.fn(),
  createHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
}));
jest.mock('../../components/Toaster', () => ({ showToast: jest.fn() }));

import enhancedStorage from '../../utils/enhancedStorage';
import { OfflineError } from '../../utils/apiError';
import { showToast } from '../../components/Toaster';
import { fetchBookHighlights, createHighlight, deleteHighlight } from '../../services/highlightsService';
import useConnectivityStore from '../connectivityStore';
import useOutboxStore from '../outboxStore';
import useHighlightsStore, { hydrateHighlights } from '../highlightsStore';

const store = () => useHighlightsStore.getState();
const outbox = () => useOutboxStore.getState();
const list = (bookId = 'b1') => store().byBook[bookId] || [];
const offline = () => Promise.reject(new OfflineError());
const serverRow = (clientId, id = 'srv_1') => ({
  status: 201,
  response: { id, client_id: clientId, page: 3, anchor_text: 'call me', anchor_bounds: null, file_hash: 'f' },
});
const make = () => store().addHighlight({ bookId: 'b1', page: 3, anchorText: 'call me', fileHash: 'f' });

beforeEach(() => {
  useConnectivityStore.setState({ online: true });
  useOutboxStore.setState({ items: [], idMap: {}, syncing: false, catchingUp: false });
  useHighlightsStore.setState({ byBook: {}, seenAt: {} });
});

describe('made offline', () => {
  it('stays drawn and waits in the outbox', async () => {
    createHighlight.mockImplementationOnce(offline);
    await expect(make()).resolves.toBeUndefined();
    expect(list()).toHaveLength(1);
    expect(list()[0]).toMatchObject({ queued: true, pending: false, anchorText: 'call me' });
    expect(outbox().items).toMatchObject([{ kind: 'highlight.add', bookId: 'b1', ref: list()[0].key }]);
  });

  it('is saved once back online, keeping its key', async () => {
    createHighlight.mockImplementationOnce(offline);
    await make();
    const { key } = list()[0];

    createHighlight.mockResolvedValueOnce(serverRow(key));
    await outbox().flush();
    expect(createHighlight).toHaveBeenLastCalledWith('b1', expect.objectContaining({ clientId: key }), { quiet: true });
    expect(list()).toEqual([expect.objectContaining({ id: 'srv_1', key, pending: false })]);
    expect(list()[0].queued).toBeFalsy();
  });

  it('is removed with a toast if the server refuses it later (R3.6)', async () => {
    createHighlight.mockImplementationOnce(offline);
    await make();
    createHighlight.mockRejectedValueOnce(new Error('Client error 400: {"error":"empty"}'));
    await outbox().flush();
    expect(list()).toEqual([]);
    expect(showToast).toHaveBeenCalledWith('Couldn\'t save a highlight you made offline', 'error');
  });

  it('removed before it was sent, never reaches the server (R3.4)', async () => {
    createHighlight.mockImplementationOnce(offline);
    await make();
    await store().removeHighlight('b1', list()[0].key);
    expect(list()).toEqual([]);
    expect(outbox().items).toEqual([]);
    await outbox().flush();
    expect(createHighlight).toHaveBeenCalledTimes(1);
  });

  it('still throws when the server answers no', async () => {
    createHighlight.mockRejectedValueOnce(new Error('Client error 400: {}'));
    await expect(make()).rejects.toThrow('Could not save highlight');
    expect(list()).toEqual([]);
    expect(outbox().items).toEqual([]);
  });
});

describe('removed offline', () => {
  const saved = { id: 'srv_9', clientId: 'hl_9', key: 'hl_9', page: 1, anchorText: 'x', anchorBounds: null, fileHash: '', pending: false };

  beforeEach(() => useHighlightsStore.setState({ byBook: { b1: [saved] } }));

  it('stays gone and waits in the outbox', async () => {
    deleteHighlight.mockImplementationOnce(offline);
    await expect(store().removeHighlight('b1', 'hl_9')).resolves.toBeUndefined();
    expect(list()).toEqual([]);
    expect(outbox().items).toMatchObject([{ kind: 'highlight.remove', ref: 'srv_9' }]);
  });

  it('doesn\'t come back when the book reloads before it syncs (R3.10)', async () => {
    deleteHighlight.mockImplementationOnce(offline);
    await store().removeHighlight('b1', 'hl_9');
    fetchBookHighlights.mockResolvedValueOnce({
      status: 200,
      response: [{ id: 'srv_9', client_id: 'hl_9', page: 1, anchor_text: 'x' }],
    });
    await store().loadHighlights('b1');
    expect(list()).toEqual([]);
  });

  it('comes back if the server refuses the removal', async () => {
    deleteHighlight.mockImplementationOnce(offline);
    await store().removeHighlight('b1', 'hl_9');
    deleteHighlight.mockRejectedValueOnce(new Error('Client error 403: {}'));
    await outbox().flush();
    expect(list()).toEqual([expect.objectContaining({ key: 'hl_9' })]);
  });

  it('a 404 later counts as done', async () => {
    deleteHighlight.mockImplementationOnce(offline);
    await store().removeHighlight('b1', 'hl_9');
    deleteHighlight.mockRejectedValueOnce(new Error('Client error 404: {}'));
    await outbox().flush();
    expect(list()).toEqual([]);
    expect(outbox().items).toEqual([]);
  });
});

it('a reload keeps highlights still waiting to be sent (R3.10)', async () => {
  createHighlight.mockImplementationOnce(offline);
  await make();
  fetchBookHighlights.mockResolvedValueOnce({ status: 200, response: [] });
  await store().loadHighlights('b1');
  expect(list()).toEqual([expect.objectContaining({ queued: true })]);
});

describe('on the device (R4.1, R4.2)', () => {
  it('comes back after a restart, without saves that were mid-request', () => {
    // What a relaunch finds on the device.
    enhancedStorage.writeCache('highlights', {
      byBook: { b1: [{ key: 'a', pending: false }, { key: 'b', pending: true }, { key: 'c', pending: false, queued: true }] },
      seenAt: { b1: 1 },
    });
    hydrateHighlights();
    expect(list().map((h) => h.key)).toEqual(['a', 'c']);
  });

  it('keeps the 30 books seen most recently', () => {
    const byBook = {};
    const seenAt = {};
    for (let i = 0; i < 35; i += 1) {
      byBook[`b${i}`] = [{ key: `k${i}` }];
      seenAt[`b${i}`] = i;
    }
    useHighlightsStore.setState({ byBook, seenAt });
    const kept = Object.keys(enhancedStorage.__saved.highlights.byBook);
    expect(kept).toHaveLength(30);
    expect(kept).not.toContain('b0');
    expect(kept).toContain('b34');
  });
});
