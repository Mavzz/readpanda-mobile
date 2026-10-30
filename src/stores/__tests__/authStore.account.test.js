// ReadPanda+ follows the account's permanent id, not its username, so a
// username change keeps the subscription (specs/coming-soon R6).

const mockStart = jest.fn();
const mockRename = jest.fn();
const mockFetchProfile = jest.fn();
let mockStored = null;

jest.mock('../../utils/enhancedStorage', () => ({
  __esModule: true,
  default: {
    getAuthData: () => mockStored,
    storeAuthData: jest.fn(),
    updateUserProfile: jest.fn(),
    clearAuthData: jest.fn(),
    renameAccountData: (...args) => mockRename(...args),
  },
}));
jest.mock('../../services/auth', () => ({ fetchProfile: () => mockFetchProfile() }));
jest.mock('../subscriptionStore', () => ({ __esModule: true, default: { getState: () => ({ start: mockStart, stop: jest.fn() }) } }));
const store = { getState: () => new Proxy({}, { get: () => jest.fn() }) };
jest.mock('../readingProgressStore', () => ({ __esModule: true, default: store, hydrateMemberProgress: jest.fn() }));
jest.mock('../commentsStore', () => ({ __esModule: true, default: store, hydrateComments: jest.fn() }));
jest.mock('../roomStore', () => ({ __esModule: true, default: store, hydrateRooms: jest.fn() }));
jest.mock('../bucketsStore', () => ({ __esModule: true, default: store, hydrateBuckets: jest.fn() }));
jest.mock('../booksStore', () => ({ __esModule: true, default: store }));
jest.mock('../notificationStore', () => ({ __esModule: true, default: store, hydrateNotifications: jest.fn() }));
jest.mock('../highlightsStore', () => ({ __esModule: true, default: store, hydrateHighlights: jest.fn() }));
jest.mock('../blocksStore', () => ({ __esModule: true, default: store }));
jest.mock('../outboxStore', () => ({ __esModule: true, default: store, hydrateOutbox: jest.fn() }));

import useAuthStore from '../authStore';

beforeEach(() => {
  mockStart.mockClear();
  mockRename.mockClear();
  mockFetchProfile.mockReset();
  mockStored = null;
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

it('starts ReadPanda+ with the account id on sign-in', async () => {
  await useAuthStore.getState().signIn({
    token: 't', refreshToken: 'r', userDetails: { username: 'ada', userId: 'u-1' },
  });
  expect(mockStart).toHaveBeenCalledWith('u-1');
});

it('never starts it by username, even for a session stored before the id', async () => {
  mockStored = { token: 't', refreshToken: 'r', userProfile: { username: 'ada' } };
  await useAuthStore.getState().loadUser();
  expect(useAuthStore.getState().user.username).toBe('ada');
  expect(mockStart).not.toHaveBeenCalled();
});

it('takes the id from a token refresh, once, and starts it then', async () => {
  useAuthStore.setState({ user: { username: 'ada' }, isAuthenticated: true });
  const account = { userId: 'u-1', displayName: 'Ada', loginType: 'email' };

  useAuthStore.getState().adoptAccount(account);
  expect(useAuthStore.getState().user).toMatchObject({ username: 'ada', userId: 'u-1', loginType: 'email' });
  expect(mockStart).toHaveBeenCalledWith('u-1');

  useAuthStore.getState().adoptAccount(account);
  expect(mockStart).toHaveBeenCalledTimes(1);
});

it('ignores a refresh without an id, or with nobody signed in', () => {
  useAuthStore.getState().adoptAccount({ userId: 'u-1' });
  useAuthStore.setState({ user: { username: 'ada' } });
  useAuthStore.getState().adoptAccount({ userId: null });
  expect(mockStart).not.toHaveBeenCalled();
});

// A username changed on another device reaches this one, data and all (R5.4).
describe('syncAccount', () => {
  const profile = (changes) => ({
    ok: true,
    profile: { user_id: 'u-1', username: 'ada', display_name: null, email: 'ada@x.io', login_type: 'social_google', ...changes },
  });

  it('takes a new username, moving the device data to it first', async () => {
    useAuthStore.setState({ user: { username: 'Ada Lovelace', userId: 'u-1' }, isAuthenticated: true });
    mockFetchProfile.mockResolvedValue(profile({ username: 'ada.l', display_name: 'Ada' }));

    await useAuthStore.getState().syncAccount();
    expect(mockRename).toHaveBeenCalledWith('Ada Lovelace', 'ada.l');
    expect(useAuthStore.getState().user).toMatchObject({
      username: 'ada.l', displayName: 'Ada', loginType: 'social_google', email: 'ada@x.io',
    });
  });

  it('leaves the data alone when the name is the same', async () => {
    useAuthStore.setState({ user: { username: 'ada', userId: 'u-1' }, isAuthenticated: true });
    mockFetchProfile.mockResolvedValue(profile());

    await useAuthStore.getState().syncAccount();
    expect(mockRename).not.toHaveBeenCalled();
    expect(useAuthStore.getState().user.loginType).toBe('social_google');
  });

  it('fills in an older session, starting ReadPanda+ by id', async () => {
    useAuthStore.setState({ user: { username: 'ada' }, isAuthenticated: true });
    mockFetchProfile.mockResolvedValue(profile());

    await useAuthStore.getState().syncAccount();
    expect(mockStart).toHaveBeenCalledWith('u-1');
    expect(useAuthStore.getState().user.userId).toBe('u-1');
  });

  it('changes nothing offline or signed out', async () => {
    useAuthStore.setState({ user: { username: 'ada' }, isAuthenticated: true });
    mockFetchProfile.mockResolvedValue({ ok: false, status: 0 });
    await useAuthStore.getState().syncAccount();
    expect(useAuthStore.getState().user).toEqual({ username: 'ada' });

    useAuthStore.setState({ user: null, isAuthenticated: false });
    await useAuthStore.getState().syncAccount();
    expect(mockFetchProfile).toHaveBeenCalledTimes(1);
  });
});
