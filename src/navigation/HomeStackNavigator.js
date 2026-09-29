import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import GenreBooksScreen from '../screens/GenreBooksScreen';
import BucketBooksScreen from '../screens/BucketBooksScreen';
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
      <Stack.Screen name="LibraryScreen" component={LibraryScreen} />
      <Stack.Screen name="GenreBooksScreen" component={GenreBooksScreen} />
      <Stack.Screen name="BucketBooksScreen" component={BucketBooksScreen} />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
