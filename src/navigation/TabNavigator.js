import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text, Platform, StyleSheet } from 'react-native';
import HomeStackNavigator from './HomeStackNavigator';
import ReadingStackNavigator from './ReadingStackNavigator';
import RoomsScreen from '../screens/RoomsScreen';
import { DS } from '../styles/global';

const Tab = createBottomTabNavigator();

const tabLabel = (label) => ({ focused, color }) => (
  <Text style={[styles.tabLabel, { color, fontFamily: focused ? DS.font.bold : DS.font.semibold }]}>
    {label}
  </Text>
);

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
        component={ReadingStackNavigator}
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

export default TabNavigator;

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  tabIcon: {
    marginTop: 0,
  },
});
