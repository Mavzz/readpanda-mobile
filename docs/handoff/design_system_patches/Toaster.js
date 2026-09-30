import React from 'react';
import { View, Text } from 'react-native';
import Toast from 'react-native-toast-message';
import { DS } from '../styles/global';

// Nocturnal Sanctuary toast: dark glass surface, full rounding, ambient shadow.
// Semantic meaning comes from the accent dot + text tint, not a loud background.
const base = (accent) => ({ text1 }) => (
  <View style={{
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
  }}>
    <View style={{ width: 8, height: 8, borderRadius: DS.radius.full, backgroundColor: accent }} />
    <Text style={{ flex: 1, color: DS.colors.onSurface, fontSize: 15, fontWeight: '600' }}>{text1}</Text>
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

export const showToast = (message, type = 'info', duration = 3000) => {
  Toast.show({
    type: type,
    text1: message,
    position: 'bottom',
    visibilityTime: duration,
    autoHide: true,
    bottomOffset: 100,
  });
};

export default Toaster;
