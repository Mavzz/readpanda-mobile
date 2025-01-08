import React from "react";
import Home from "./HomeScreen";
import Profile from "./ProfileScreen";
import { Button} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

const Tab = createBottomTabNavigator();

const Root = ({route}) => {
    //const route = useRoute();
    const { username } = route.params;
    console.log(`Root username: ${username}`);
    return (
      <Tab.Navigator>
        <Tab.Screen 
        name="ReadPanda" 
        component={Home} 
        initialParams={{ username: username }}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}  />
        <Tab.Screen
          name="Profile"
          component={Profile}
          initialParams={{ username: username }} 
          options={{
            tabBarIcon: ({ color, size }) => (
            <Icon name="person" color={color} size={size} />
          ),
            headerRight: () => <Button title="Sign Out" color="#000"></Button>,
          }}
        />
      </Tab.Navigator>
    );
};

export default Root;