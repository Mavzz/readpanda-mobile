import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyBooksScreen from '../screens/MyBooksScreen';
import ReadingScreen from '../screens/ReadingScreen';
import SoloBookScreen from '../screens/SoloBookScreen';
import MyBucketScreen from '../screens/MyBucketScreen';
import BucketGridScreen from '../screens/BucketGridScreen';
import BookGridScreen from '../screens/BookGridScreen';
import { DS } from '../styles/global';

const Stack = createNativeStackNavigator();

// Stack navigator for the My Books tab (8b) — everything that's yours: the
// tab itself, the full shelf behind its "See all" (4a), the solo read a shelf
// row opens (4b), your buckets (9a) and the "See all" behind them (10e). The
// tab bar stays visible on all of them. A room book opens the active Room,
// which lives in the main stack (1b, the old room read, is gone).
const MyBooksStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="MyBooksMain" component={MyBooksScreen} />
      <Stack.Screen name="Shelf" component={ReadingScreen} />
      <Stack.Screen name="SoloBookScreen" component={SoloBookScreen} />
      <Stack.Screen name="MyBucket" component={MyBucketScreen} />
      <Stack.Screen name="BucketGrid" component={BucketGridScreen} />
      <Stack.Screen name="BookGrid" component={BookGridScreen} />
    </Stack.Navigator>
  );
};

export default MyBooksStackNavigator;
