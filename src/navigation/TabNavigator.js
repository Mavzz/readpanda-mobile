import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { Text, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeStackNavigator from './HomeStackNavigator';
import DiscoverStackNavigator from './DiscoverStackNavigator';
import MyBooksStackNavigator from './MyBooksStackNavigator';
import RoomsScreen from '../screens/RoomsScreen';
import useLayout from '../hooks/useLayout';
import { DS } from '../styles/global';

const Tab = createBottomTabNavigator();

const tabLabel = (label) => ({ focused, color, position }) => (
  <Text
    style={[
      position === 'beside-icon' ? styles.tabLabelBeside : styles.tabLabel,
      { color, fontFamily: focused ? DS.font.bold : DS.font.semibold },
    ]}
    numberOfLines={1}
  >
    {label}
  </Text>
);

const tabIcon = (name, size) => ({ color, focused }) => (
  <Icon name={focused ? name : `${name}-outline`} color={color} size={size} />
);

const TABS = [
  { name: 'Home', label: 'Home', icon: 'book', component: HomeStackNavigator },
  { name: 'Discover', label: 'Discover', icon: 'compass', component: DiscoverStackNavigator },
  { name: 'MyBooks', label: 'My Books', icon: 'bookmarks', component: MyBooksStackNavigator },
  { name: 'Rooms', label: 'Rooms', icon: 'people', component: RoomsScreen },
];

// iPad bar (IPAD_AND_HOME_14_16.md § 1): the same four tabs, hugging their
// content with icon and label side by side, centered with 56pt between them
// (48 in the portrait layout). The library stretches every item to fill the
// bar and has no option to center them, so items stop flexing and the first
// and last take auto margins, which centers the group.
const largeItemStyle = (index, gap) => [
  styles.largeItem,
  { marginHorizontal: gap / 2 },
  index === 0 && styles.pushRight,
  index === TABS.length - 1 && styles.pushLeft,
];

// 4-tab IA (DISCOVER_MYBOOKS_8a_8c.md): Home · Discover · My Books · Rooms.
// Each tab does one job — Home jumps back in, Discover finds books, My Books
// is everything that's yours, Rooms is reading socially. Home keeps 1a's book
// icon rather than the spec's house.
// No blur library is installed (@react-native-community/blur etc.), so the
// glass tab bar falls back to a solid surfaceContainerHigh per the handoff's
// explicit fallback clause.
const TabNavigator = () => {
  const { sizeClass, isLarge } = useLayout();
  const insets = useSafeAreaInsets();
  const gap = sizeClass === 'wide' ? 56 : 48;
  // The phone keeps its tuned fixed height; the iPad's comes from the inset,
  // since some iPads have no home indicator.
  const largeBottom = Math.max(insets.bottom, 24);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: isLarge
          ? [styles.bar, styles.largeBar, { height: 12 + 28 + largeBottom, paddingBottom: largeBottom }]
          : [styles.bar, styles.phoneBar],
        tabBarLabelPosition: isLarge ? 'beside-icon' : 'below-icon',
        tabBarActiveTintColor: DS.colors.primary,
        tabBarInactiveTintColor: DS.colors.onSurfaceVariant,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      {TABS.map((tab, index) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tabLabel(tab.label),
            tabBarIcon: tabIcon(tab.icon, isLarge ? 20 : 23),
            tabBarItemStyle: isLarge ? largeItemStyle(index, gap) : undefined,
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

export default TabNavigator;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderTopWidth: 0,
    elevation: 0,
  },
  phoneBar: {
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
  },
  largeBar: {
    paddingTop: 12,
  },
  largeItem: {
    flex: 0,
    paddingHorizontal: 0,
  },
  pushRight: {
    marginStart: 'auto',
  },
  pushLeft: {
    marginEnd: 'auto',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
  tabLabelBeside: {
    fontSize: 13,
    marginStart: 7,
  },
  tabIcon: {
    marginTop: 0,
  },
});
