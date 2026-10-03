import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyBooksScreen from '../screens/MyBooksScreen';
import ReadingScreen from '../screens/ReadingScreen';
import RoomBookScreen from '../screens/RoomBookScreen';
import SoloBookScreen from '../screens/SoloBookScreen';
import MyBucketScreen from '../screens/MyBucketScreen';
import BucketGridScreen from '../screens/BucketGridScreen';
import { DS } from '../styles/global';

const Stack = createNativeStackNavigator();

// Stack navigator for the My Books tab (8b) — everything that's yours: the
// tab itself, the full shelf behind its "See all" (4a), the two views a shelf
// row opens (room read 1b, solo read 4b), your buckets (9a) and the "See
// all" behind them (10e). The tab bar stays visible on all of them.
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
      <Stack.Screen name="RoomBookScreen" component={RoomBookScreen} />
      <Stack.Screen name="SoloBookScreen" component={SoloBookScreen} />
      <Stack.Screen name="MyBucket" component={MyBucketScreen} />
      <Stack.Screen name="BucketGrid" component={BucketGridScreen} />
    </Stack.Navigator>
  );
};

export default MyBooksStackNavigator;
