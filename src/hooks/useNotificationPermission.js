import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import log from '../utils/logger';

const isEnabled = (status) =>
  status === messaging.AuthorizationStatus.AUTHORIZED ||
  status === messaging.AuthorizationStatus.PROVISIONAL;

// Whether iOS lets ReadPanda show notifications: true / false, or null until
// known. Read when the screen focuses and again when the app comes back to
// the foreground, since "Open Settings" leaves the app to change it.
const useNotificationPermission = () => {
  const [enabled, setEnabled] = useState(null);

  const check = useCallback(async () => {
    try {
      setEnabled(isEnabled(await messaging().hasPermission()));
    } catch (error) {
      // No Firebase app (Android without google-services.json): nothing to say.
      log.warn('Could not read notification permission:', error?.message);
      setEnabled(null);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    check();
  }, [check]));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        check();
      }
    });
    return () => subscription.remove();
  }, [check]);

  return enabled;
};

export default useNotificationPermission;
