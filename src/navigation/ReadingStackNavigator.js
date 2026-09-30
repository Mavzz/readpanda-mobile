import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ReadingScreen from '../screens/ReadingScreen';
import RoomBookScreen from '../screens/RoomBookScreen';
import SoloBookScreen from '../screens/SoloBookScreen';
import { DS } from '../styles/global';

const Stack = createNativeStackNavigator();

// Stack navigator for the Reading tab — the shelf (4a) and the two detail
// views a row can open: the room read (1b) and the solo read (4b).
const ReadingStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="ReadingMain" component={ReadingScreen} />
      <Stack.Screen name="RoomBookScreen" component={RoomBookScreen} />
      <Stack.Screen name="SoloBookScreen" component={SoloBookScreen} />
    </Stack.Navigator>
  );
};

export default ReadingStackNavigator;
