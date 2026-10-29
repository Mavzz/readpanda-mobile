import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { DS } from '../styles/global';
import { isOnline } from '../stores/connectivityStore';

// Nocturnal Sanctuary toast: dark glass surface, full rounding, ambient shadow.
// Semantic meaning comes from the accent dot + text tint, not a loud background.
const base = (accent) => ({ text1 }) => (
  <View style={styles.toast}>
    <View style={[styles.dot, { backgroundColor: accent }]} />
    <Text style={styles.text}>{text1}</Text>
  </View>
);

const toastConfig = {
  success: base(DS.colors.primary),
  error: base(DS.colors.error),
  info: base(DS.colors.onSurfaceVariant),
};

const Toaster = () => {
  return <Toast config={toastConfig} />;
};

// The offline toast explains every failure that follows it, so for as long
// as it's up, a screen's own "Couldn't …" error doesn't replace it (only one
// toast shows at a time). specs/offline-first R1.5.
const OFFLINE_WINDOW = 3000;
let offlineShownAt = 0;

export const showOfflineToast = () => {
  if (Date.now() - offlineShownAt < OFFLINE_WINDOW) {
    return;
  }
  showToast('You\'re offline. Try again when you\'re connected.', 'info', OFFLINE_WINDOW);
  offlineShownAt = Date.now();
};

export const showToast = (message, type = 'info', duration = 3000) => {
  if (type === 'error' && Date.now() - offlineShownAt < OFFLINE_WINDOW) {
    return;
  }
  Toast.show({
    type: type,
    text1: message,
    position: 'bottom',
    visibilityTime: duration,
    autoHide: true,
    // Above the Offline pill while it's showing, rather than over it.
    bottomOffset: isOnline() ? 100 : 132,
  });
};

const styles = StyleSheet.create({
  toast: {
    minHeight: 56,
    width: '90%',
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.full,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // Ambient shadow per DESIGN.md: offset 0/20, blur 40, background @ 40%
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
    marginHorizontal: '5%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: DS.radius.full,
  },
  text: {
    flex: 1,
    color: DS.colors.onSurface,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Toaster;
