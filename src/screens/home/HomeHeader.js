import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import getInitials from '../../utils/getInitials';
import NotificationList from '../../components/NotificationList';
import useNotificationStore from '../../stores/notificationStore';

// Greeting, the notification bell (and its inbox sheet), and the avatar into
// Profile. The notification store is read only here, so a badge change
// doesn't re-render the rest of Home.
const HomeHeader = ({ username, showBell, onOpenProfile }) => {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notifLoading = useNotificationStore((s) => s.loading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  const handleNotificationPress = () => {
    setNotifModalVisible(true);
    fetchNotifications();
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good evening</Text>
          <Text style={styles.username} numberOfLines={1} ellipsizeMode="tail">{username}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* No bell on first run — nothing can notify you yet. */}
          {showBell && (
            <Pressable onPress={handleNotificationPress} style={styles.bellWrap}>
              <Icon name="notifications-outline" size={24} color={DS.colors.onSurfaceVariant} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
          <Pressable onPress={onOpenProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(username)}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={notifModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {notifLoading ? (
              <ActivityIndicator size="large" color={DS.colors.primary} />
            ) : (
              <NotificationList
                notifications={notifications}
                onNotificationRead={markAsRead}
                onClose={() => setNotifModalVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 6,
  },
  greeting: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
  },
  username: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexShrink: 0,
  },
  bellWrap: {
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadgeText: {
    fontSize: 10,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },

  // Notifications modal (same treatment as CommonHeader's)
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(6, 13, 32, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderTopLeftRadius: DS.radius.xl,
    borderTopRightRadius: DS.radius.xl,
    height: '80%',
    width: '100%',
    paddingTop: 20,
  },
});

export default HomeHeader;
