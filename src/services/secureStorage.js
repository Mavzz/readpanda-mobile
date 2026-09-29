import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';
import { STORAGE_CATEGORIES } from '../constants/storageConstants';
import log from '../utils/logger';

// Two secrets live in the Keychain rather than in the app:
//  - the MMKV encryption key, generated once per device. A key shipped in the
//    app (e.g. from .env) would be readable by anyone with the IPA, so the
//    encryption would protect nothing.
//  - the access and refresh tokens themselves.
//
// The Keychain is async but the app reads storage synchronously everywhere
// (apiService, loadUser, the reading-position helpers), so initSecureStorage()
// runs once before the navigator mounts: it opens MMKV and loads the tokens
// into memory. Reads are synchronous from then on; token writes update memory
// at once and reach the Keychain in the background, in order.

const STORE_ID = 'readpanda-storage';

const MMKV_KEY_SERVICE = 'com.readpanda.app.mmkv-key';
const TOKEN_SERVICE = 'com.readpanda.app.auth-tokens';

// Readable after the first unlock since boot, so a push handled in the
// background can still reach it. THIS_DEVICE_ONLY keeps both secrets out of
// backups: a backup restored onto another phone signs the reader out rather
// than carrying their tokens across.
const KEYCHAIN_OPTIONS = {
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// MMKV keys are capped at 16 bytes. 16 characters from a 64-symbol alphabet
// is 96 bits of randomness.
const KEY_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const generateKey = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => KEY_ALPHABET[b & 63]).join('');
};

let store = null;
let tokens = { token: null, refreshToken: null };
let tokenWrites = Promise.resolve();
let initPromise = null;

const loadOrCreateKey = async () => {
  const saved = await Keychain.getGenericPassword({ service: MMKV_KEY_SERVICE });
  if (saved) {
    return { key: saved.password, created: false };
  }
  const key = generateKey();
  await Keychain.setGenericPassword('mmkv', key, { service: MMKV_KEY_SERVICE, ...KEYCHAIN_OPTIONS });
  return { key, created: true };
};

const openStore = (key, created) => {
  const opened = new MMKV({ id: STORE_ID, encryptionKey: key });
  if (created) {
    // A key made just now can't decrypt anything already on disk — data from
    // a backup of another phone, or from before the Keychain was wiped. Start
    // clean; the reader signs in again. On a fresh install there's nothing
    // to clear.
    opened.clearAll();
  }
  return opened;
};

const persistTokens = () => {
  const snapshot = { ...tokens };
  tokenWrites = tokenWrites
    .then(() => (snapshot.token || snapshot.refreshToken
      ? Keychain.setGenericPassword('auth', JSON.stringify(snapshot), {
        service: TOKEN_SERVICE,
        ...KEYCHAIN_OPTIONS,
      })
      : Keychain.resetGenericPassword({ service: TOKEN_SERVICE })))
    .catch((error) => log.error('Failed to write auth tokens to the Keychain:', error));
  return tokenWrites;
};

const parseJson = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const loadTokens = async () => {
  const saved = parseJson((await Keychain.getGenericPassword({ service: TOKEN_SERVICE }))?.password);
  if (saved) {
    tokens = { token: saved.token || null, refreshToken: saved.refreshToken || null };
  }

  // iOS keeps Keychain items after the app is deleted, but not the MMKV
  // store. Tokens with no profile beside them belong to a previous install.
  if ((tokens.token || tokens.refreshToken) && !store.contains(STORAGE_CATEGORIES.MMKV.USER_PROFILE)) {
    tokens = { token: null, refreshToken: null };
    await persistTokens();
  }
};

export const initSecureStorage = () => {
  if (!initPromise) {
    initPromise = (async () => {
      const { key, created } = await loadOrCreateKey();
      store = openStore(key, created);
      await loadTokens();
    })().catch((error) => {
      // Let a retry start over rather than handing back the same failure.
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
};

export const getStore = () => {
  if (!store) {
    throw new Error('Secure storage used before initSecureStorage() finished');
  }
  return store;
};

export const getTokens = () => tokens;

export const setTokens = (next) => {
  tokens = { ...tokens, ...next };
  persistTokens();
};

export const clearTokens = () => {
  tokens = { token: null, refreshToken: null };
  persistTokens();
};
