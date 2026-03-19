import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { DS } from '../styles/global';

const NotificationItem = ({ notification, onPress }) => {
  const formattedDate = new Date(notification.timestamp).toLocaleDateString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification,
      ]}
      onPress={onPress}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <Icon
            name={notification.type === 'NEW_BOOK' ? 'book-outline' : 'notifications-outline'}
            size={24}
            color={DS.colors.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{formattedDate}</Text>
        </View>
        {!notification.read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );
};

const EmptyNotifications = () => (
  <View style={styles.emptyContainer}>
    <Icon name="notifications-off-outline" size={48} color={DS.colors.onSurfaceVariant} />
    <Text style={styles.emptyText}>No notifications yet</Text>
  </View>
);

const NotificationList = ({ notifications, onNotificationRead, onClose }) => {
  const navigation = useNavigation();

  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await onNotificationRead(notification.id);
    }

    if (notification.type === 'NEW_BOOK' && notification.bookId) {
      onClose?.();
      navigation.navigate('ManuscriptScreen', { bookId: notification.bookId });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color={DS.colors.onSurfaceVariant} />
        </Pressable>
      </View>
            
      <FlatList
        data={notifications}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyNotifications}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: DS.colors.onSurface,
  },
  closeButton: {
    padding: 5,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  notificationItem: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.xl,
    marginBottom: 12,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  unreadNotification: {
    backgroundColor: DS.colors.surfaceContainer,
    borderLeftWidth: 3,
    borderLeftColor: DS.colors.primary,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: DS.colors.onSurfaceVariant,
    opacity: 0.7,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    marginTop: 12,
  },
});

export default NotificationList;