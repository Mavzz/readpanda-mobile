import { Platform } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../screens/LoginScreen";
import Root from "../screens/Root_HomeScreen";
import SignUp from "../screens/SignUpScreen";
import Interest from "../screens/InterestScreen";
import Profile from "../screens/ProfileScreen";
import ManuscriptScreen from "../screens/ManuscriptScreen";
import {MyTheme} from "../styles/global";

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={Login} options={{headerShown: false}}/>
        <Stack.Screen name="Root" component={Root} options={{headerShown: false}}/>
        <Stack.Screen name="SignUp" component={SignUp} options={{headerShown: false}}/>
        <Stack.Screen name="InterestScreen" component={Interest} options={{headerShown: false}}/>
        <Stack.Screen 
          name="ManuscriptScreen" 
          component={ManuscriptScreen} 
          options={({ route }) => ({ 
            title: route.params.book.title, // Set the header title to the book's title
            headerBackTitle: '',
          })} 
        />
        <Stack.Screen 
          name="Profile" 
          component={Profile} 
          options={{ 
            headerTitle: '',
            headerBackTitle: '',
            headerTransparent: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;