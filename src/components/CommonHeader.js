import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, Pressable, Modal, ActivityIndicator } from 'react-native';
import SearchBar from './SearchBar';
import log from "../utils/logger";
import Icon from 'react-native-vector-icons/Ionicons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
    withRepeat,
    withTiming, Easing
} from 'react-native-reanimated';
import { NotificationBadge } from './Badge';
import NotificationList from './NotificationList';
import { NotificationService } from '../services/notificationService';


const CommonHeader = ({ showSearch, navigation }) => {

    const [notifications, setNotifications] = useState([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const notificationScale = useSharedValue(1);
    const profileScale = useSharedValue(1);

    const animateIcon = (scaleValue, onComplete) => {
        'worklet';
        scaleValue.value = withSequence(
            scaleValue.value = withSequence(
                withSpring(1.2, { damping: 200 }),
                withSpring(1, { damping: 200 })
            )
        );
        onComplete?.();
    }
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
            1
        );
    };

    const notificationAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: notificationScale.value },
            { rotateZ: `${rotateZ.value}rad` }
        ]
    }));

    const profileAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: profileScale.value }]
    }));

    const handleProfilePress = () => {
        log.info("Profile icon pressed");
        animateIcon(profileScale, () => {
            navigation.navigate('Profile');
        });
    };

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const fetchedNotifications = await NotificationService.getNotifications();
            setNotifications(fetchedNotifications);
            //const unreadCount = await NotificationService.getUnreadCount();
            //setNotificationCount(unreadCount);
        } catch (error) {
            log.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotificationPress = async () => {
        log.info("Notification icon pressed");
        ringBell();
        animateIcon(notificationScale, () => {
            setIsModalVisible(true);
            fetchNotifications();
        });
    };

    const handleNotificationRead = async (notificationId) => {
        try {
            await NotificationService.markAsRead(notificationId);
            // Update local state
            setNotifications(prevNotifications =>
                prevNotifications.map(notif =>
                    notif.id === notificationId
                        ? { ...notif, read: true }
                        : notif
                )
            );
            const unreadCount = await NotificationService.getUnreadCount();
            setNotificationCount(unreadCount);
        } catch (error) {
            log.error('Error marking notification as read:', error);
        }
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
                        <Animated.View style={[styles.iconContainer, profileAnimatedStyle]}>
                            <Icon
                                name="person-circle-outline"
                                size={28}
                                color="#666"
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
                                notificationAnimatedStyle
                            ]}>
                            <Icon
                                name="notifications-outline"
                                size={28}
                                color="#666"
                            />
                            {notificationCount > 0 && (
                                <NotificationBadge count={notificationCount} />
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
                        {isLoading ? (
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