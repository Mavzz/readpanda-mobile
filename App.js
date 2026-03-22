import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from 'react-native-splash-screen';
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import useAuthStore from './src/stores/authStore';

const App = () => {
  const isLoading = useAuthStore((state) => state.isLoading);
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const minTimePassed = useRef(false);
  const authDone = useRef(false);

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
    if (!isLoading) {
      authDone.current = true;
      tryFadeOut();
    }
  }, [isLoading, tryFadeOut]);

  return (
    <View style={styles.container}>
      <AppNavigator />
      {splashVisible && (
        <Animated.View
          style={[styles.splash, { opacity: fadeAnim }]}
          pointerEvents="none"
        >
          <View style={styles.splashContent}>
            <Image
              source={require('./src/assets/readpandaLogo_New.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Animated.Text style={styles.title}>ReadPanda</Animated.Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

export default App;