import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { primaryButton as PrimaryButton } from '../components/Button';
import ProfilePicture from '../components/ProfilePicture';
import log from '../utils/logger';
import { useScreenTracking } from '../utils/screenTracking';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/auth';
import enhanceedStorage from '../utils/enhanceedStorage';
import { DS } from '../styles/global';

const ProfileSection = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

const ProfileScreen = () => {
  const { user, signOut, updateUser } = useAuth();
  const username = user?.username;
  const navigation = useNavigation();
  const refreshToken = enhanceedStorage.getRefreshToken();

  useScreenTracking('ProfileScreen');

  log.info(`Profile screen loaded for user: ${username}`);

  const handleSignOut = async () => {
    log.info('Signing out...');
    log.info('refreshToken:', refreshToken);
    await logout(username, refreshToken);
    signOut();
    log.info('User signed out successfully');
  };

  const handleProfilePictureChange = (newImageUri) => {
    log.info('Profile picture changed:', newImageUri);
    if (updateUser) {
      updateUser({ profilePicture: newImageUri });
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.header}>
            <ProfilePicture
              size={100}
              editable={true}
              user={user}
              onImageChange={handleProfilePictureChange}
              style={styles.profilePicture}
            />
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
            <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('InterestScreen', { username: username, preferences: JSON.parse(user.preferences) })}>
              <Text style={styles.settingText}>Edit Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Notification Preferences</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
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
            <TouchableOpacity style={[styles.settingItem, styles.settingItemLast]}>
              <Text style={styles.settingText}>Privacy Policy</Text>
            </TouchableOpacity>
          </ProfileSection>
        </View>
      </ScrollView>
      <View style={styles.signOutContainer}>
        <PrimaryButton title="Sign Out" onPress={handleSignOut} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePicture: {
    marginBottom: 16,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '700',
    color: DS.colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionContent: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.xl,
    paddingHorizontal: 20,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: DS.colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
  },
  settingItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${DS.colors.outlineVariant}26`,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingText: {
    fontSize: 16,
    color: DS.colors.onSurface,
  },
  signOutContainer: {
    padding: 20,
    width: '100%',
  },
});

export default ProfileScreen;
