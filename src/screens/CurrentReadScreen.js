import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { screenStyles, MyTheme } from '../styles/global';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import Icon from 'react-native-vector-icons/Ionicons';

const CurrentRead = ({ route }) => {
  const { user } = useAuth();
  const username = user?.username;
  const navigation = useNavigation();

  log.info(`CurrentRead screen loaded for user: ${username}`);

  const handleContinueReading = () => {
    log.info('Continue reading pressed');
    // TODO: Navigate to current book
  };

  const handleViewProgress = () => {
    log.info('View progress pressed');
    // TODO: Show reading statistics
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={MyTheme.colors.background} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={screenStyles.screenTitle}>Current Read</Text>
          <Text style={screenStyles.captionText}>
            Continue your reading journey
          </Text>

          {/* Currently Reading Book */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Currently Reading</Text>

            {/* TODO: Replace with actual current book data */}
            <View style={screenStyles.emptyContainer}>
              <Icon name="book-outline" size={64} color="#ccc" />
              <Text style={screenStyles.emptyTitle}>No Current Read</Text>
              <Text style={screenStyles.emptyDescription}>
                You haven't started reading any book yet. Go to Explore Books to find something interesting!
              </Text>
              <TouchableOpacity
                style={screenStyles.primaryButton}
                onPress={() => navigation.navigate('Explore Books')}
              >
                <Text style={screenStyles.primaryButtonText}>Browse Books</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Reading Progress Section */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Reading Statistics</Text>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[screenStyles.screenTitle, styles.statNumber]}>0</Text>
                <Text style={screenStyles.captionText}>Books Read</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[screenStyles.screenTitle, styles.statNumber]}>0</Text>
                <Text style={screenStyles.captionText}>Pages Read</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[screenStyles.screenTitle, styles.statNumber]}>0</Text>
                <Text style={screenStyles.captionText}>Hours Read</Text>
              </View>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={screenStyles.section}>
            <Text style={screenStyles.subsectionTitle}>Recent Activity</Text>
            <Text style={screenStyles.bodyText}>
              Your reading activity will appear here once you start reading books.
            </Text>
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

export default CurrentRead;
