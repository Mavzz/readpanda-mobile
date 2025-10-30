import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import Icon from "react-native-vector-icons/Ionicons";
import { Platform } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import HomeScreen from "../screens/HomeScreen";
import JoinRoomScreen from "../screens/JoinRoomScreen";
import CurrentReadScreen from "../screens/CurrentReadScreen";
import MyRoomsScreen from "../screens/MyRoomsScreen";
import InterestScreen from "../screens/InterestScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ManuscriptScreen from "../screens/ManuscriptScreen";
import CommonHeader from '../components/CommonHeader';
import { MyTheme } from "../styles/global";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();


// Stack navigator for each tab that needs additional screens
const HomeStackNavigator = () => {
  const { user } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animationEnabled: true,
        cardStyle: { backgroundColor: MyTheme.colors.background },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManuscriptScreen"
        component={ManuscriptScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        presentation: 'screen',
        header: ({ navigation, route }) => {
          const showSearch = route.name === "Explore Books";
          return (
            <CommonHeader
              showSearch={showSearch}
              navigation={navigation}
            />
          );
        }
      }}
    >
      <Tab.Screen
        name="Explore Books"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="book" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Join Room"
        component={JoinRoomScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="chatbubbles" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Current Read"
        component={CurrentReadScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="bookmarks" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="My Rooms"
        component={MyRoomsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="people" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};


// Main Stack Navigator that wraps the Tab Navigator
const MainStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: "Profile"
        }}
      />
      <Stack.Screen
        name="Interest"
        component={InterestScreen}
        options={{
          headerShown: true,
          title: "Select Interests"
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;