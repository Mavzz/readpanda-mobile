import AppNavigator from "./src/navigation/AppNavigator";
import SplashScreen from 'react-native-splash-screen';
import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";

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
            <Animated.Image
              source={require('./src/assets/splash.png')}
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
    backgroundColor: '#E8FFC8',
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
    color: '#333',
    marginTop: 20,
  },
});

export default App;