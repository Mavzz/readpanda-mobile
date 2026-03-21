import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from 'react-native-splash-screen';
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import ReadPandaLogo from "./src/components/ReadPandaLogo";
import { DS } from "./src/styles/global";

const App = () => {
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Hide native splash, then fade out our overlay
    SplashScreen.hide();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setSplashVisible(false);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <AppNavigator />
      {splashVisible && (
        <Animated.View
          style={[styles.splash, { opacity: fadeAnim }]}
          pointerEvents="none"
        >
          <View style={styles.splashContent}>
            <ReadPandaLogo size={160} />
            <Animated.Text style={styles.title}>ReadPanda</Animated.Text>
            <Animated.Text style={styles.tagline}>Your reading sanctuary</Animated.Text>
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
    backgroundColor: DS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  splashContent: {
    alignItems: 'center',
    marginTop: -40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: DS.colors.primary,
    marginTop: 24,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: DS.colors.onSurfaceVariant,
    marginTop: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default App;