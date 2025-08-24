import Home from "./HomeScreen";
import Profile from "./ProfileScreen";
import Favorite from "./FavoritesScreen";
import JoinRoom from "./JoinRoomScreen";
import CurrentRead from "./CurrentReadScreen";
import MyRooms from "./MyRoomsScreen";
import { Button} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import log from "../utils/logger";
import CommonHeader from '../components/CommonHeader';

const Tab = createBottomTabNavigator();

const Root = ({route}) => {
    //const route = useRoute();
    const { username } = route.params;
    log.info(`Root screen loaded for user: ${username}`);
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
                username={username}
              />
            );
          }
        }}
      >
        <Tab.Screen 
        name="Explore Books" 
        component={Home} 
        initialParams={{ username: username }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name = "book" color={color} size={size} />
          ),
        }}  />
        <Tab.Screen
          name="Join Room"
          component={JoinRoom}
          initialParams={{ username: username }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="chatbubbles" color={color} size={size} />
            ),
          }} />
        <Tab.Screen
          name="Current Read"
          component={CurrentRead}
          initialParams={{ username: username }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="bookmarks" color={color} size={size} />
            ),
          }} />
        <Tab.Screen
          name="My Rooms"
          component={MyRooms}
          initialParams={{ username: username }}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="people" color={color} size={size} />
            ),
          }} />
      </Tab.Navigator>
    );
};

/*        <Tab.Screen
          name="Profile"
          component={Profile}
          initialParams={{ username: username }} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="person" color={color} size={size} />
            ),
            headerRight: () => <Button title="Sign Out" color="#000"></Button>,
          }}
        /> */

export default Root;