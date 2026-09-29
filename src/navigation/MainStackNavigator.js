import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import TabNavigator from './TabNavigator';
import ManuscriptScreen from '../screens/ManuscriptScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InterestScreen from '../screens/InterestScreen';
import CreateBucketScreen from '../screens/CreateBucketScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import RoomLobbyScreen from '../screens/roomLobby/RoomLobbyScreen';
import { DS } from '../styles/global';

const Stack = createStackNavigator();

const BackButton = ({ onPress, tintColor }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.backButton}
    accessibilityLabel="Go back"
    accessibilityRole="button"
    accessibilityHint="Navigates to the previous screen"
  >
    <Icon name="arrow-back" color={tintColor} size={24} />
  </TouchableOpacity>
);

const headerLeftBack = ({ onPress, tintColor }) => (
  <BackButton onPress={onPress} tintColor={tintColor} />
);

// Main Stack Navigator that wraps the Tab Navigator
const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: DS.colors.background },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      {/* The reader is a destination, not a tab sub-page: registering it here
          (a sibling of Tabs) puts it over the tab bar, so a book gets the
          whole screen. It also means every caller — Home, the Reading tab, a
          bucket, a room — reaches it with a plain
          navigate('ManuscriptScreen'), since the name resolves upward from
          anywhere in the tree. */}
      <Stack.Screen
        name="ManuscriptScreen"
        component={ManuscriptScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profile',
          headerStyle: {
            backgroundColor: DS.colors.surfaceContainerLow,
          },
          headerTintColor: DS.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: headerLeftBack,
        }}
      />
      <Stack.Screen
        name="Interest"
        component={InterestScreen}
        options={{
          headerShown: true,
          title: 'Select Interests',
          headerStyle: {
            backgroundColor: DS.colors.surfaceContainerLow,
          },
          headerTintColor: DS.colors.onSurface,
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: headerLeftBack,
        }}
      />
      <Stack.Screen
        name="CreateBucketScreen"
        component={CreateBucketScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          presentation: 'modal',
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
      <Stack.Screen
        name="CreateRoomScreen"
        component={CreateRoomScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          presentation: 'modal',
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
      <Stack.Screen
        name="RoomLobbyScreen"
        component={RoomLobbyScreen}
        options={{
          headerShown: false,
          animationEnabled: true,
          cardStyle: { backgroundColor: DS.colors.background },
        }}
      />
    </Stack.Navigator>
  );
};

export default MainStackNavigator;

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 8,
  },
});
