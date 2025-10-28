import React from 'react';
import { View, Text, StyleSheet } from 'react-native';


const NotificationBadge = ({ notificationCount }) => {
  if (!notificationCount) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {notificationCount > 99 ? '99+' : notificationCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
});

export  { NotificationBadge };