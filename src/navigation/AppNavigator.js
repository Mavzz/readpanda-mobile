import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { MyTheme } from '../styles/global';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import { Text } from 'react-native';
import Toaster from '../components/Toaster';
import useInviteDeepLink from '../hooks/useInviteDeepLink';

const Stack = createStackNavigator();

// Needed so the invite deep link can navigate from outside a screen.
const navigationRef = createNavigationContainerRef();

const linking = {
  prefixes: ['readpanda://'],
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
          Home: 'Home',
          Reading: 'Reading',
          Rooms: 'Rooms',
          Profile: 'Profile',
        },
      },
      'oauth/google': 'Auth',
    },
  },
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  // readpanda://join/{CODE} — from the Room Detail QR. Not in `linking` above
  // because joining is an API call, not just a route.
  useInviteDeepLink({ isAuthenticated, navigationRef });

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={MyTheme}
      linking={linking}
      fallback={<Text>Loading...</Text>}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
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