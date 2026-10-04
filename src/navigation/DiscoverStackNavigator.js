import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DiscoverScreen from '../screens/DiscoverScreen';
import BookGridScreen from '../screens/BookGridScreen';
import BucketGridScreen from '../screens/BucketGridScreen';
import { DS } from '../styles/global';

const Stack = createNativeStackNavigator();

// Stack navigator for the Discover tab (8a): the tab and its two "See all"
// views, Popular (10c) and Curated buckets (10e), which keep the tab bar. A
// curated bucket (9b) and a book (8c) open over the tab bar, so both live in
// the main stack.
const DiscoverStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="DiscoverMain" component={DiscoverScreen} />
      <Stack.Screen name="BookGrid" component={BookGridScreen} />
      <Stack.Screen name="BucketGrid" component={BucketGridScreen} />
    </Stack.Navigator>
  );
};

export default DiscoverStackNavigator;
