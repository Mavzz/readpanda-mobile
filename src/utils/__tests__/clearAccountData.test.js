// account-deletion R3.1: a deleted account's data stored on this device goes
// with it, and nobody else's does.
const mockStore = new Map();

jest.mock('../../services/secureStorage', () => ({
  getStore: () => ({
    getAllKeys: () => [...mockStore.keys()],
    delete: (key) => mockStore.delete(key),
    set: (key, value) => mockStore.set(key, value),
    getString: (key) => mockStore.get(key),
    clearAll: () => mockStore.clear(),
  }),
  getTokens: jest.fn(),
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

const enhancedStorage = require('../enhancedStorage').default;

describe('clearAccountData', () => {
  beforeEach(() => {
    mockStore.clear();
    [
      'last_read_position::ishmael',
      'reading_days::ishmael',
      'pref_reader_page_theme::ishmael',
      'last_read_position::queequeg',
      'last_read_position::ishmael2',
      'user_profile',
    ].forEach((key) => mockStore.set(key, '{}'));
  });

  it('removes every key scoped to the account', () => {
    enhancedStorage.clearAccountData('ishmael');
    expect([...mockStore.keys()].filter((k) => k.endsWith('::ishmael'))).toEqual([]);
  });

  it('keeps other accounts, look-alike usernames and unscoped keys', () => {
    enhancedStorage.clearAccountData('ishmael');
    expect([...mockStore.keys()].sort()).toEqual([
      'last_read_position::ishmael2',
      'last_read_position::queequeg',
      'user_profile',
    ]);
  });

  it('does nothing without a username', () => {
    enhancedStorage.clearAccountData(undefined);
    expect(mockStore.size).toBe(6);
  });
});
