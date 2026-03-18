import React, { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, Pressable, Modal, ActivityIndicator } from 'react-native';
import SearchBar from './SearchBar';
import ProfilePicture from './ProfilePicture';
import log from '../utils/logger';
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withRepeat,
  withTiming, Easing,
} from 'react-native-reanimated';
import { NotificationBadge } from './Badge';
import NotificationList from './NotificationList';
import { useAuth } from '../contexts/AuthContext';
import useNotificationStore from '../stores/notificationStore';


const CommonHeader = ({ showSearch, navigation }) => {
  const { user } = useAuth();

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const loading = useNotificationStore((s) => s.loading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  const notificationScale = useSharedValue(1);
  const profileScale = useSharedValue(1);

  const animateIcon = (scaleValue, onComplete) => {
    'worklet';
    scaleValue.value = withSequence(
      withSpring(1.2, { damping: 200 }),
      withSpring(1, { damping: 200 }),
    );
    onComplete?.();
  };
  const rotateZ = useSharedValue(0);

  const ringBell = () => {
    'worklet';
    // Reset rotation to 0 before starting new animation
    rotateZ.value = 0;

    // Create a ringing effect with multiple rotations
    rotateZ.value = withRepeat(
      withSequence(
        withTiming(-0.3, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        withTiming(0.3, {
          duration: 400,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        withTiming(0, {
          duration: 200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
      ),
      1,
    );
  };

  const notificationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: notificationScale.value },
      { rotateZ: `${rotateZ.value}rad` },
    ],
  }));

  const profileAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: profileScale.value }],
  }));

  const handleProfilePress = () => {
    log.info('Profile icon pressed');
    animateIcon(profileScale, () => {
      navigation.navigate('Profile');
    });
  };

  const handleNotificationPress = async () => {
    log.info('Notification icon pressed');
    ringBell();
    animateIcon(notificationScale, () => {
      setIsModalVisible(true);
      fetchNotifications();
    });
  };

  const handleNotificationRead = async (notificationId) => {
    await markAsRead(notificationId);
  };

  /* useEffect(() => {
 
         // Set up polling for new notifications
         const pollInterval = setInterval(async () => {
             const unreadCount = await NotificationService.getUnreadCount();
             setNotificationCount(unreadCount);
         }, 30000); // Poll every 30 seconds
 
         return () => clearInterval(pollInterval);
     }, []);*/

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          {/* Profile Icon */}
          <Pressable onPress={handleProfilePress}>
            <Animated.View style={[styles.profileContainer, profileAnimatedStyle]}>
              <ProfilePicture
                size={42}
                editable={false}
                user={user}
              />
            </Animated.View>
          </Pressable>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            {showSearch && <SearchBar />}
          </View>

          {/* Notification Icon */}
          <Pressable onPress={handleNotificationPress}>
            <Animated.View
              style={[
                styles.iconContainer,
                notificationAnimatedStyle,
              ]}>
              <Icon
                name="notifications-outline"
                size={28}
                color="#666"
              />
              {unreadCount > 0 && (
                <NotificationBadge count={unreadCount} />
              )}
            </Animated.View>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              <NotificationList
                notifications={notifications}
                onNotificationRead={handleNotificationRead}
                onClose={() => setIsModalVisible(false)}
              />
            )}

          </View>
        </View>

      </Modal>
    </>

  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
    width: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 10,
    height: 60,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    marginTop: Platform.OS === 'android' ? 0 : 0,

  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  searchContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
});

export default CommonHeader;