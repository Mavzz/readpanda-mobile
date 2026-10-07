import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyTheme } from '../styles/global';
import { AuthProvider } from '../contexts/AuthContext';
import useAuthStore from '../stores/authStore';
import AuthStackNavigator from './AuthStackNavigator';
import MainStackNavigator from './MainStackNavigator';
import { Text } from 'react-native';
import Toaster from '../components/Toaster';
import useInviteDeepLink from '../hooks/useInviteDeepLink';
import usePushNotifications from '../hooks/usePushNotifications';
import useWidgetDeepLink from '../hooks/useWidgetDeepLink';
import useWidgetSync from '../widget/useWidgetSync';

const Stack = createNativeStackNavigator();

// Needed so the invite deep link can navigate from outside a screen.
const navigationRef = createNavigationContainerRef();

const linking = {
  prefixes: ['readpanda://'],
  // Invite and widget links are handled by their own hooks (they need an API
  // call or a store lookup first). Left to React Navigation, their paths would
  // be turned into routes that don't exist.
  filter: (url) => !/^readpanda:\/\/(join|read|room|library|book|bucket)\b/.test(url),
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'Login',
          SignUp: 'SignUp',
          Interest: 'Interest',
        },
      },
      Main: {
        screens: {
          Tabs: {
            screens: {
              Home: 'Home',
              Discover: 'Discover',
              MyBooks: 'MyBooks',
              Rooms: 'Rooms',
            },
          },
          Profile: 'Profile',
        },
      },
      'oauth/google': 'Auth',
    },
  },
};

const AppContent = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // readpanda://join/{CODE} — from the Room Detail QR. Not in `linking` above
  // because joining is an API call, not just a route.
  useInviteDeepLink({ isAuthenticated, navigationRef });
  usePushNotifications({ isAuthenticated, navigationRef });
  // Home-screen widget: taps on it, and keeping what it shows current.
  useWidgetDeepLink({ isAuthenticated, navigationRef });
  useWidgetSync({ isAuthenticated });

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={MyTheme}
      linking={linking}
      fallback={<Text>Loading...</Text>}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainStackNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStackNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const AppNavigator = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
};

export default AppNavigator;