import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ManuscriptScreen from '../screens/ManuscriptScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InterestScreen from '../screens/InterestScreen';
import CreateBucketScreen from '../screens/CreateBucketScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import RoomLobbyScreen from '../screens/roomLobby/RoomLobbyScreen';
import { DS } from '../styles/global';

const Stack = createNativeStackNavigator();

// Screens that use the system header. The back button is the platform's own
// (chevron on iOS, arrow on Android): a custom headerLeft inside the native
// header gets wrapped in the system's button chrome and sits off-centre.
const nativeHeader = (title) => ({
  headerShown: true,
  title,
  headerStyle: {
    backgroundColor: DS.colors.surfaceContainerLow,
  },
  headerTintColor: DS.colors.onSurface,
  headerTitleStyle: {
    fontWeight: '600',
  },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
});

// Create flows are designed as full-screen takeovers with their own × close,
// not iOS page sheets — a sheet crowds their header against its rounded top.
const createFlow = {
  headerShown: false,
  presentation: 'fullScreenModal',
  contentStyle: { backgroundColor: DS.colors.background },
};

// Main Stack Navigator that wraps the Tab Navigator
const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      {/* The reader is a destination, not a tab sub-page: registering it here
          (a sibling of Tabs) puts it over the tab bar, so a book gets the
          whole screen. It also means every caller — Home, the Reading tab, a
          bucket, a room — reaches it with a plain
          navigate('ManuscriptScreen'), since the name resolves upward from
          anywhere in the tree. */}
      <Stack.Screen name="ManuscriptScreen" component={ManuscriptScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={nativeHeader('Profile')} />
      <Stack.Screen
        name="Interest"
        component={InterestScreen}
        options={nativeHeader('Select Interests')}
      />
      <Stack.Screen name="CreateBucketScreen" component={CreateBucketScreen} options={createFlow} />
      <Stack.Screen name="CreateRoomScreen" component={CreateRoomScreen} options={createFlow} />
      <Stack.Screen name="RoomLobbyScreen" component={RoomLobbyScreen} />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;
