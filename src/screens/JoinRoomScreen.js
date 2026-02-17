import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { screenStyles, MyTheme } from '../styles/global';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';

const JoinRoom = () => {
  const { user } = useAuth();
  const username = user?.username;
  const navigation = useNavigation();

  log.info(`JoinRoom screen loaded for user: ${username}`);

  const handleCreateRoom = () => {
    log.info('Create room pressed');
    // TODO: Implement room creation
  };

  const handleJoinRoom = () => {
    log.info('Join room pressed');
    // TODO: Implement room joining
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={MyTheme.colors.background} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={screenStyles.screenTitle}>Join Reading Room</Text>
          <Text style={screenStyles.captionText}>
            Connect with other readers and discuss books together
          </Text>

          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Create a New Room</Text>
            <Text style={screenStyles.bodyText}>
              Start your own reading room and invite friends to join the conversation.
            </Text>
            <TouchableOpacity
              style={screenStyles.primaryButton}
              onPress={handleCreateRoom}
            >
              <Text style={screenStyles.primaryButtonText}>Create Room</Text>
            </TouchableOpacity>
          </View>

          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Join Existing Room</Text>
            <Text style={screenStyles.bodyText}>
              Enter a room code or browse available reading rooms to join.
            </Text>
            <TouchableOpacity
              style={screenStyles.secondaryButton}
              onPress={handleJoinRoom}
            >
              <Text style={screenStyles.secondaryButtonText}>Browse Rooms</Text>
            </TouchableOpacity>
          </View>

          <View style={screenStyles.section}>
            <View style={screenStyles.emptyContainer}>
              <Icon name="people" size={64} color="#ccc" />
              <Text style={screenStyles.emptyTitle}>No Active Rooms</Text>
              <Text style={screenStyles.emptyDescription}>
                You haven't joined any reading rooms yet. Create one or join an existing room to start connecting with other readers.
              </Text>
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
});

export default JoinRoom;
