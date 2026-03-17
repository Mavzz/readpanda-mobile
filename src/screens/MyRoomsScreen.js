import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { screenStyles, MyTheme } from '../styles/global';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';

const MyRooms = ({ route }) => {
  const { user } = useAuth();
  const username = user?.username;
  const navigation = useNavigation();

  log.info('MyRooms screen user data:', user);
  log.info(`MyRooms screen loaded for user: ${username}`);

  const handleCreateRoom = () => {
    log.info('Create new room pressed');
    navigation.navigate('Join Room');
  };

  const handleJoinRoom = () => {
    log.info('Join room pressed');
    navigation.navigate('Join Room');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={MyTheme.colors.background} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={screenStyles.screenTitle}>My Rooms</Text>
          <Text style={screenStyles.captionText}>
            Your reading rooms and discussions
          </Text>

          {/* Active Rooms Section */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Active Rooms</Text>

            <View style={screenStyles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={screenStyles.emptyTitle}>No Rooms Yet</Text>
              <Text style={screenStyles.emptyDescription}>
                You haven't joined or created any reading rooms yet. Start connecting with other readers!
              </Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={screenStyles.primaryButton}
              onPress={handleCreateRoom}
            >
              <Text style={screenStyles.primaryButtonText}>Create New Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={screenStyles.secondaryButton}
              onPress={handleJoinRoom}
            >
              <Text style={screenStyles.secondaryButtonText}>Browse & Join Rooms</Text>
            </TouchableOpacity>
          </View>

          {/* Room History */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Room History</Text>
            <Text style={screenStyles.bodyText}>
              Your past room activities and discussions will appear here.
            </Text>
          </View>

          {/* Room Statistics */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Statistics</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[screenStyles.screenTitle, styles.statNumber]}>0</Text>
                <Text style={screenStyles.captionText}>Rooms Joined</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[screenStyles.screenTitle, styles.statNumber]}>0</Text>
                <Text style={screenStyles.captionText}>Messages Sent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[screenStyles.screenTitle, styles.statNumber]}>0</Text>
                <Text style={screenStyles.captionText}>Books Discussed</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MyTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    marginBottom: 0,
    color: MyTheme.colors.primary,
  },
});

export default MyRooms;
