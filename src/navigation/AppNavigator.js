import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { MyTheme } from '../styles/global';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import AuthStackNavigator from './AuthStackNavigator';
import MainTabNavigator from './MainTabNavigator';
import { Text } from 'react-native';
import Toaster from '../components/Toaster';

const Stack = createStackNavigator();

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
          'Explore Books': 'Home',
          'Join Room': 'JoinRoom',
          'Current Read': 'CurrentRead',
          'My Rooms': 'MyRooms',
          Profile: 'Profile',
        },
      },
      'oauth/google': 'Auth',
    },
  },
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer theme={MyTheme} linking={linking} fallback={<Text>Loading...</Text>}>
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