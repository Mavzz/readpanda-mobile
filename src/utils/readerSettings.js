import { useCallback, useState } from 'react';
import enhancedStorage from './enhancedStorage';

// The reader's own choices from Settings (PROFILE_SETTINGS_7a_7b.md § 7b).
// Kept per account in MMKV next to the other preferences, and read
// synchronously so the reader opens in the right mode on its first frame.
//
// Values are stored as strings: getUserPreference falls back on any falsy
// value, so a stored `false` would read back as the default.
export const READER_SETTINGS = {
  pageMode: {
    key: 'reader_page_mode',
    defaultValue: 'scroll',
    options: [
      { value: 'scroll', label: 'Scroll' },
      { value: 'page', label: 'Page' },
    ],
  },
  pageTheme: {
    key: 'reader_page_theme',
    defaultValue: 'paper',
    options: [
      { value: 'paper', label: 'Paper' },
      { value: 'sepia', label: 'Sepia' },
      { value: 'night', label: 'Night' },
    ],
  },
  progressVisibility: {
    key: 'progress_visibility',
    defaultValue: 'members',
    options: [
      { value: 'members', label: 'Room members' },
      { value: 'me', label: 'Only me' },
    ],
  },
  spoilerProtection: {
    key: 'spoiler_protection',
    defaultValue: 'on',
    options: [
      { value: 'on', label: 'On' },
      { value: 'off', label: 'Off' },
    ],
  },
};

export const getReaderSetting = (name) => {
  const { key, defaultValue } = READER_SETTINGS[name];
  return enhancedStorage.getUserPreference(key, defaultValue);
};

export const setReaderSetting = (name, value) => {
  enhancedStorage.storeUserPreference(READER_SETTINGS[name].key, value);
};

export const labelForSetting = (name, value) => (
  READER_SETTINGS[name].options.find((o) => o.value === value)?.label ?? ''
);

// One setting as component state, written through to storage.
export const useReaderSetting = (name) => {
  const [value, setValue] = useState(() => getReaderSetting(name));
  const update = useCallback((next) => {
    setReaderSetting(name, next);
    setValue(next);
  }, [name]);
  return [value, update];
};
