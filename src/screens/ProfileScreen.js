import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import Background from "../components/Background";
import { primaryButton as PrimaryButton } from "../components/Button";
import log from "../utils/logger";
import { useScreenTracking } from "../utils/screenTracking";
import { useAuth } from '../contexts/AuthContext';

const ProfileSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { username } = user.username;
  const navigation = useNavigation();

  log.info(`Profile screen loaded for user: ${username}`);

  const handleSignOut = async () => {
    log.info("Signing out...");
    // Clear the token from storage
    signOut();
    log.info("User signed out successfully");

    // Navigate to the login screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Login" }],
      }));
  };

  return (
    <Background>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.welcome}>Welcome, {username}!</Text>
          </View>

          <ProfileSection title="Reading Statistics">
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Books Read</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>3</Text>
                <Text style={styles.statLabel}>Currently Reading</Text>
              </View>
            </View>
          </ProfileSection>

          <ProfileSection title="Account Settings">
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('InterestScreen', { username: username, preferences: JSON.parse(preferences) })}>
              <Text style={styles.settingText}>Edit Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Notification Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Privacy Settings</Text>
            </TouchableOpacity>
          </ProfileSection>

          <ProfileSection title="About">
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Help & Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Privacy Policy</Text>
            </TouchableOpacity>
          </ProfileSection>
        </View>
      </ScrollView>
      <View style={{ padding: 20, width: '100%' }} >
        <PrimaryButton title="Sign Out" onPress={handleSignOut} />
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#444',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#444',
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 30,
    width: '100%',
    alignSelf: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ProfileScreen;
