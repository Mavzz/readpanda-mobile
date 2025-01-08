import React from "react";
import Home from "./HomeScreen";
import Profile from "./ProfileScreen";
import { Button} from "react-native";
import { useRoute } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

const Tab = createBottomTabNavigator();

const Root = ({route}) => {
    //const route = useRoute();
    const { username } = route.params;
    console.log(`Root username: ${username}`);
    return (
      <Tab.Navigator>
        <Tab.Screen name="ReadPanda" component={Home} initialParams={{ username: username }}  />
        <Tab.Screen
          name="Profile"
          component={Profile}
          initialParams={{ username: username }} 
          options={{
            headerRight: () => <Button title="Sign Out" color="#000"></Button>,
          }}
        />
      </Tab.Navigator>
    );
};

export default Root;