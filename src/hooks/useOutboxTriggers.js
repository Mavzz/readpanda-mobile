import { useEffect } from 'react';
import { AppState } from 'react-native';
import useConnectivityStore from '../stores/connectivityStore';
import useOutboxStore from '../stores/outboxStore';

// When the outbox sends what the reader did offline (specs/offline-first
// R3.3): the moment the connection comes back, and whenever the app comes to
// the foreground. The third trigger, the account being restored at launch,
// is in authStore's hydrateCaches.
const useOutboxTriggers = ({ isAuthenticated }) => {
  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const unsubscribe = useConnectivityStore.subscribe((state, previous) => {
      if (state.online && !previous.online) {
        useOutboxStore.getState().catchUp();
      }
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        useOutboxStore.getState().flush();
      }
    });

    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [isAuthenticated]);
};

export default useOutboxTriggers;
