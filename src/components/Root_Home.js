import React from "react";
import Home from "./Home";
import Profile from "./Profile";
import { Button} from "react-native";
import { useRoute } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

const Tab = createBottomTabNavigator();

const Root = () => {
    const route = useRoute();
    const { username } = route.params;

    return (
      <Tab.Navigator>
        <Tab.Screen name="ReadPanda" component={Home} initialParams={{ username }} />
        <Tab.Screen
          name="Profile"
          component={Profile}
          initialParams={{ username }}
          options={{
            headerRight: () => <Button title="Sign Out" color="#000"></Button>,
          }}
        />
      </Tab.Navigator>
    );
};

export default Root;