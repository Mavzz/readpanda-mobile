import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DS } from '../styles/global';

const NotificationBadge = ({ count }) => {
  if (!count) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: DS.colors.error,
    borderRadius: DS.radius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: DS.colors.surfaceContainer,
  },
  badgeText: {
    color: DS.colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});

export { NotificationBadge };