import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Login from "../screens/LoginScreen";
import Interest from "../screens/InterestScreen";
import SignUp from "../screens/SignUpScreen";

const Stack = createStackNavigator();

const AuthStackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="Interest" component={Interest} />
    </Stack.Navigator>
  );
};

export default AuthStackNavigator;