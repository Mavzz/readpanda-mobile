import { useEffect } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import useAuthStore from '../stores/authStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import useRoomStore from '../stores/roomStore';
import useCommentsStore from '../stores/commentsStore';
import log from '../utils/logger';
import { buildWidgetState } from './widgetState';

// Keeps the home-screen widget in step with the app (WIDGET_5a_5b.md,
// "Timeline & states"). Whenever the stores behind it change — a progress
// save, rooms loading, comments arriving — the state is rebuilt and handed to
// WidgetBridge, which writes it to the App Group and reloads the widget.
// Leaving the app flushes immediately, since that's when progress was just
// saved and the widget is about to be seen.
//
// Signed out, the widget is cleared: nothing of the previous reader stays on
// the home screen.

const { WidgetBridge } = NativeModules;
const SETTLE_MS = 800;

const push = () => {
  try {
    WidgetBridge.update(buildWidgetState());
  } catch (error) {
    log.error('Failed to update the widget:', error);
  }
};

const useWidgetSync = ({ isAuthenticated }) => {
  const authLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !WidgetBridge) {
      return undefined;
    }
    // Still reading the stored session on launch — don't clear a widget that
    // is about to be refilled.
    if (authLoading) {
      return undefined;
    }
    if (!isAuthenticated) {
      WidgetBridge.clear();
      return undefined;
    }

    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(push, SETTLE_MS);
    };

    schedule();
    const unsubscribers = [
      useReadingProgressStore.subscribe(schedule),
      useRoomStore.subscribe(schedule),
      useCommentsStore.subscribe(schedule),
    ];
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        clearTimeout(timer);
        push();
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      appState.remove();
    };
  }, [isAuthenticated, authLoading]);
};

export default useWidgetSync;
