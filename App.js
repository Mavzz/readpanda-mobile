import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from 'react-native-splash-screen';
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import useAuthStore from './src/stores/authStore';
import { initSecureStorage } from './src/services/secureStorage';
import log from './src/utils/logger';
import * as Sentry from '@sentry/react-native';

const App = () => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const minTimePassed = useRef(false);
  const authDone = useRef(false);
  // Storage has to be open before anything reads it — the auth store's
  // loadUser runs as soon as the navigator mounts. 'opening' | 'ready' | 'failed'
  const [storage, setStorage] = useState('opening');

  const openStorage = useCallback(() => {
    setStorage('opening');
    initSecureStorage()
      .then(() => setStorage('ready'))
      .catch((error) => {
        log.error('Could not open secure storage:', error);
        // Handled, so Sentry wouldn't see it otherwise, but the reader is
        // stuck on the retry screen until it opens.
        Sentry.captureException(error);
        setStorage('failed');
      });
  }, []);

  useEffect(() => {
    openStorage();
  }, [openStorage]);

  const tryFadeOut = useCallback(() => {
    if (minTimePassed.current && authDone.current) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }
  }, [fadeAnim]);

  useEffect(() => {
    // Dismiss native splash immediately so our branded JS overlay takes over
    SplashScreen.hide();

    // Enforce a minimum display time so the splash never flickers by too fast
    const timer = setTimeout(() => {
      minTimePassed.current = true;
      tryFadeOut();
    }, 600);

    return () => clearTimeout(timer);
  }, [tryFadeOut]);

  useEffect(() => {
    // A failure has to lift the splash too, or it would hide the retry.
    if (!isLoading || storage === 'failed') {
      authDone.current = true;
      tryFadeOut();
    }
  }, [isLoading, storage, tryFadeOut]);

  // Gesture handler's root: 9a's swipe-to-delete and drag-to-reorder need it
  // above every screen.
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Insets for everything, not just what's inside a navigator: the
          Offline pill draws beside the NavigationContainer. React Navigation
          uses this one rather than adding its own. */}
      {storage === 'ready' && (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <AppNavigator />
        </SafeAreaProvider>
      )}
      {storage === 'failed' && (
        <View style={styles.failed}>
          <Text style={styles.failedText}>ReadPanda couldn&apos;t open its secure storage.</Text>
          <Pressable onPress={openStorage} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      )}
      {splashVisible && (
        <Animated.View
          style={[styles.splash, { opacity: fadeAnim }]}
          pointerEvents="none"
        >
          <View style={styles.splashContent}>
            <Image
              source={require('./src/assets/splashLogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Animated.Text style={styles.title}>ReadPanda</Animated.Text>
          </View>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  failed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  failedText: {
    fontSize: 15,
    color: '#dae2fd',
    textAlign: 'center',
    marginBottom: 16,
  },
  retry: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#ffddb8',
  },
  retryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0b1326',
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0b1326',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  splashContent: {
    alignItems: 'center',
    marginTop: -40,
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffddb8',
    marginTop: 20,
  },
});

// Sentry.wrap reports render errors anywhere below the root.
export default Sentry.wrap(App);