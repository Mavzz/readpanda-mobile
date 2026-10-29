// The notification store's settings, against a mocked API layer: the service
// mapping is exercised through the request mocks, the store through it.

jest.mock('../../services/authenticatedRequests', () => ({
  makeAuthenticatedGetRequest: jest.fn(),
  makeAuthenticatedPutRequest: jest.fn(),
  makeAuthenticatedPostRequest: jest.fn(),
  makeAuthenticatedDeleteRequest: jest.fn(),
}));

// The inbox is kept on the device (persistSlice); here it goes nowhere.
jest.mock('../../utils/enhancedStorage', () => ({
  __esModule: true,
  default: { getUserProfile: () => ({ username: 'me' }), readCache: () => null, writeCache: jest.fn() },
}));

import {
  makeAuthenticatedGetRequest,
  makeAuthenticatedPutRequest,
} from '../../services/authenticatedRequests';
import { NotificationService } from '../../services/notificationService';
import useNotificationStore from '../notificationStore';
import useConnectivityStore from '../connectivityStore';
import useOutboxStore from '../outboxStore';
import { OfflineError } from '../../utils/apiError';

const store = () => useNotificationStore.getState();
const allOn = { replies: true, room_comments: true, room_joins: true, room_book: true, new_books: true };

const initial = useNotificationStore.getState();
beforeEach(() => {
  jest.clearAllMocks();
  useNotificationStore.setState(initial, true);
  useConnectivityStore.setState({ online: true });
  useOutboxStore.setState({ items: [], idMap: {}, syncing: false, catchingUp: false });
});

describe('fetchSettings', () => {
  it('maps the server switches to the app names', async () => {
    makeAuthenticatedGetRequest.mockResolvedValue({ response: { ...allOn, room_comments: false } });

    await store().fetchSettings();

    expect(makeAuthenticatedGetRequest.mock.calls[0][0]).toMatch(/\/users\/me\/notification-settings$/);
    expect(store().settings).toEqual({
      replies: true, roomComments: false, roomJoins: true, roomBook: true, newBooks: true,
    });
  });

  it('leaves settings unloaded when the request fails', async () => {
    makeAuthenticatedGetRequest.mockRejectedValue(new Error('offline'));

    await store().fetchSettings();

    expect(store().settings).toBeNull();
  });
});

describe('setSetting', () => {
  beforeEach(async () => {
    makeAuthenticatedGetRequest.mockResolvedValue({ response: allOn });
    await store().fetchSettings();
  });

  it('moves the switch at once and sends only that one', async () => {
    let finish;
    makeAuthenticatedPutRequest.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

    const saving = store().setSetting('roomComments', false);
    expect(store().settings.roomComments).toBe(false); // before the server answers
    expect(makeAuthenticatedPutRequest.mock.calls[0][1]).toEqual({ room_comments: false });

    finish({ response: { ...allOn, room_comments: false } });
    await expect(saving).resolves.toBe(true);
    expect(store().settings.roomComments).toBe(false);
  });

  it('puts the switch back when saving fails', async () => {
    makeAuthenticatedPutRequest.mockRejectedValue(new Error('500'));

    await expect(store().setSetting('replies', false)).resolves.toBe(false);

    expect(store().settings.replies).toBe(true);
  });

  it('only puts back the switch that failed', async () => {
    let failFirst;
    makeAuthenticatedPutRequest
      .mockReturnValueOnce(new Promise((_, reject) => { failFirst = reject; }))
      .mockResolvedValueOnce({ response: { ...allOn, new_books: false } });

    const first = store().setSetting('replies', false);
    await store().setSetting('newBooks', false);
    failFirst(new Error('500'));
    await first;

    expect(store().settings.replies).toBe(true);
    expect(store().settings.newBooks).toBe(false);
  });
});

it('clearNotifications forgets the settings (sign-out)', async () => {
  makeAuthenticatedGetRequest.mockResolvedValue({ response: allOn });
  await store().fetchSettings();

  store().clearNotifications();

  expect(store().settings).toBeNull();
});

describe('toNotification', () => {
  it('carries the room fields and uses the latest update as the time', async () => {
    makeAuthenticatedGetRequest.mockResolvedValue({
      response: [{
        id: 7, type: 'ROOM_COMMENTS', title: 'AI Learning', message: '3 new comments',
        book_id: 'bk_1', room_id: 'rm_1', count: 3, is_read: false,
        created_at: '2026-10-16T10:00:00Z', updated_at: '2026-10-16T10:20:00Z',
      }],
    });

    const [n] = await NotificationService.getNotifications();

    expect(n).toEqual({
      id: 7, type: 'ROOM_COMMENTS', title: 'AI Learning', message: '3 new comments',
      timestamp: '2026-10-16T10:20:00Z', read: false, bookId: 'bk_1', roomId: 'rm_1', count: 3,
    });
  });

  it('defaults count and room for older rows', async () => {
    makeAuthenticatedGetRequest.mockResolvedValue({
      response: [{ id: 1, type: 'NEW_BOOK', message: 'Dune is ready to read.', book_id: 'bk_1', created_at: '2026-10-01T00:00:00Z' }],
    });

    const [n] = await NotificationService.getNotifications();

    expect(n.count).toBe(1);
    expect(n.roomId).toBeNull();
    expect(n.timestamp).toBe('2026-10-01T00:00:00Z');
  });
});

// specs/offline-first R3.1, R3.6, R3.10, R5.3, R5.4
describe('offline', () => {
  const row = (id, read = false) => ({ id, type: 'REPLY', message: 'hi', is_read: read, created_at: '2026-10-01T00:00:00Z' });
  const loadTwo = async () => {
    makeAuthenticatedGetRequest.mockResolvedValueOnce({ response: [row(1), row(2)] });
    await store().fetchNotifications();
  };

  it('keeps the list when it can\'t be fetched', async () => {
    await loadTwo();
    makeAuthenticatedGetRequest.mockRejectedValueOnce(new OfflineError());
    await store().fetchNotifications();
    expect(store().notifications.map((n) => n.id)).toEqual([1, 2]);
    expect(store().unreadCount).toBe(2);
  });

  it('a read offline sticks, survives a refetch, and is sent when back', async () => {
    await loadTwo();
    useConnectivityStore.setState({ online: false });
    await store().markAsRead(1);
    expect(store().unreadCount).toBe(1);
    expect(makeAuthenticatedPutRequest).not.toHaveBeenCalled();

    useConnectivityStore.setState({ online: true });
    // A refetch before it's sent still shows it read.
    makeAuthenticatedPutRequest.mockImplementationOnce(() => Promise.reject(new TypeError('Network request failed')));
    await useOutboxStore.getState().flush();
    makeAuthenticatedGetRequest.mockResolvedValueOnce({ response: [row(1), row(2)] });
    await store().fetchNotifications();
    expect(store().notifications.find((n) => n.id === 1).read).toBe(true);

    makeAuthenticatedPutRequest.mockResolvedValueOnce({ status: 204 });
    await useOutboxStore.getState().flush();
    expect(makeAuthenticatedPutRequest.mock.calls.at(-1)[0]).toMatch(/\/notifications\/1\/read$/);
    expect(makeAuthenticatedPutRequest.mock.calls.at(-1)[2]).toEqual({ quiet: true });
    expect(useOutboxStore.getState().items).toEqual([]);
  });

  it('a refused read puts the dot back', async () => {
    await loadTwo();
    makeAuthenticatedPutRequest.mockRejectedValueOnce(new Error('Client error 404: {}'));
    await store().markAsRead(2);
    expect(store().notifications.find((n) => n.id === 2).read).toBe(false);
    expect(store().unreadCount).toBe(2);
  });
});
