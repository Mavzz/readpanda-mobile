import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/home/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import GenreBooksScreen from '../screens/GenreBooksScreen';
import BucketBooksScreen from '../screens/BucketBooksScreen';
import { DS } from '../styles/global';

const Stack = createStackNavigator();

// Stack navigator for the Home tab — "Tonight" plus everything it can drill into.
const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animationEnabled: true,
        cardStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
      <Stack.Screen name="GenreBooksScreen" component={GenreBooksScreen} animationEnabled />
      <Stack.Screen name="BucketBooksScreen" component={BucketBooksScreen} animationEnabled />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
