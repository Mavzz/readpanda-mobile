import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ManuscriptScreen from '../screens/ManuscriptScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import InterestScreen from '../screens/InterestScreen';
import CreateBucketScreen from '../screens/CreateBucketScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import RoomLobbyScreen from '../screens/roomLobby/RoomLobbyScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import CuratedBucketScreen from '../screens/CuratedBucketScreen';
import PaywallScreen from '../screens/PaywallScreen';
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
          whole screen. It also means every caller — Home, My Books, a
          bucket, a room — reaches it with a plain
          navigate('ManuscriptScreen'), since the name resolves upward from
          anywhere in the tree. */}
      <Stack.Screen name="ManuscriptScreen" component={ManuscriptScreen} />
      {/* Profile (7a) and Settings (7b) draw their own 38pt back button. */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen
        name="Interest"
        component={InterestScreen}
        options={nativeHeader('Select Interests')}
      />
      <Stack.Screen name="CreateBucketScreen" component={CreateBucketScreen} options={createFlow} />
      <Stack.Screen name="CreateRoomScreen" component={CreateRoomScreen} options={createFlow} />
      <Stack.Screen name="RoomLobbyScreen" component={RoomLobbyScreen} />
      {/* Book detail (8c) is opened from Discover, any bucket and search, so
          it sits here beside the reader rather than in one tab's stack — and,
          like the reader, over the tab bar. */}
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      {/* A curated bucket (9b) has no tab bar either: its hero is full-bleed. */}
      <Stack.Screen name="CuratedBucket" component={CuratedBucketScreen} />
      {/* ReadPanda+ (usePlusGate). A takeover like the create flows it
          interrupts, so it reads as a step, not a sheet over them. */}
      <Stack.Screen name="Paywall" component={PaywallScreen} options={createFlow} />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;
