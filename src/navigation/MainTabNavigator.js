import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ReadingScreen from '../screens/ReadingScreen';
import RoomsScreen from '../screens/RoomsScreen';
import InterestScreen from '../screens/InterestScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ManuscriptScreen from '../screens/ManuscriptScreen';
import GenreBooksScreen from '../screens/GenreBooksScreen';
import BucketBooksScreen from '../screens/BucketBooksScreen';
import CreateBucketScreen from '../screens/CreateBucketScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import RoomLobbyScreen from '../screens/RoomLobbyScreen';
import { DS } from '../styles/global';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const BackButton = ({ onPress, tintColor }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.backButton}
    accessibilityLabel="Go back"
    accessibilityRole="button"
    accessibilityHint="Navigates to the previous screen"
  >
    <Icon name="arrow-back" color={tintColor} size={24} />
  </TouchableOpacity>
);

const headerLeftBack = ({ onPress, tintColor }) => (
  <BackButton onPress={onPress} tintColor={tintColor} />
);

const tabLabel = (label) => ({ focused, color }) => (
  <Text style={[styles.tabLabel, { color, fontFamily: focused ? DS.font.bold : DS.font.semibold }]}>
    {label}
  </Text>
);

// Stack navigator for the Home tab — "Tonight" plus everything it can drill into.
const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animationEnabled: true,
        cardStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
      <Stack.Screen name="ManuscriptScreen" component={ManuscriptScreen} animationEnabled />
      <Stack.Screen name="GenreBooksScreen" component={GenreBooksScreen} animationEnabled />
      <Stack.Screen name="BucketBooksScreen" component={BucketBooksScreen} animationEnabled />
    </Stack.Navigator>
  );
};

// 3-tab IA per design_handoff_redesign § 1a/1b/1c: Home · Reading · Rooms.
// No blur library is installed (@react-native-community/blur etc.), so the
// glass tab bar falls back to a solid surfaceContainerHigh per the handoff's
// explicit fallback clause.
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: DS.colors.surfaceContainerHigh,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarActiveTintColor: DS.colors.primary,
        tabBarInactiveTintColor: DS.colors.onSurfaceVariant,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: tabLabel('Home'),
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'book' : 'book-outline'} color={color} size={23} />
          ),
        }}
      />
      <Tab.Screen
        name="Reading"
        component={ReadingScreen}
        options={{
          tabBarLabel: tabLabel('Reading'),
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'bookmarks' : 'bookmarks-outline'} color={color} size={23} />
          ),
        }}
      />
      <Tab.Screen
        name="Rooms"
        component={RoomsScreen}
        options={{
          tabBarLabel: tabLabel('Rooms'),
          tabBarIcon: ({ color, focused }) => (
            <Icon name={focused ? 'people' : 'people-outline'} color={color} size={23} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};


// Main Stack Navigator that wraps the Tab Navigator
const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profile',
          headerStyle: {
            backgroundColor: DS.colors.surfaceContainerLow,
          },
          headerTintColor: DS.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: headerLeftBack,
        }}
      />
      <Stack.Screen
        name="Interest"
        component={InterestScreen}
        options={{
          headerShown: true,
          title: 'Select Interests',
          headerStyle: {
            backgroundColor: DS.colors.surfaceContainerLow,
          },
          headerTintColor: DS.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: headerLeftBack,
        }}
      />
      <Stack.Screen
        name="CreateBucketScreen"
        component={CreateBucketScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          presentation: 'modal',
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
      <Stack.Screen
        name="CreateRoomScreen"
        component={CreateRoomScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          presentation: 'modal',
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
      <Stack.Screen
        name="RoomLobbyScreen"
        component={RoomLobbyScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  tabIcon: {
    marginTop: 0,
  },
});
