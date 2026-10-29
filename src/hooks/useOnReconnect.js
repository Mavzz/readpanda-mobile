import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useConnectivityStore from '../stores/connectivityStore';

// What a screen shows in place of its error when it has nothing cached and
// there's no connection (specs/offline-first R5.5).
export const OFFLINE_MESSAGE = 'You\'re offline. This will load when you\'re back online.';

// Calls `callback` when the connection comes back while the screen is
// focused, so what failed offline loads without a pull to refresh (R5.6).
// A screen out of sight refetches on its own focus anyway.
const useOnReconnect = (callback) => {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useFocusEffect(
    useCallback(() => useConnectivityStore.subscribe((state, previous) => {
      if (state.online && !previous.online) {
        latest.current?.();
      }
    }), []),
  );
};

export default useOnReconnect;
