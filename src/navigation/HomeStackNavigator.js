import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import BookGridScreen from '../screens/BookGridScreen';
import { DS } from '../styles/global';

const Stack = createNativeStackNavigator();

// Stack navigator for the Home tab — "Tonight" plus everything it can drill into.
const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="BookGrid" component={BookGridScreen} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
