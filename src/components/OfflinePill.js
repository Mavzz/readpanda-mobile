import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { MOTION } from '../styles/motion';
import useConnectivityStore from '../stores/connectivityStore';
import useOutboxStore from '../stores/outboxStore';

// The quiet sign that the app is offline (specs/offline-first R2): a small
// glass pill near the bottom, on every signed-in screen. It takes no taps and
// moves nothing, so a screen works exactly as it would without it. Back
// online, it reads "Syncing…" while what was done offline is sent, then goes.
//
// On iOS it lives in a FullWindowOverlay, a window of its own above the
// app's: the create flows and the paywall are native modals, which would
// otherwise cover it.
const Overlay = Platform.OS === 'ios' ? FullWindowOverlay : View;

// Just clear of the phone's 85pt tab bar (the iPad's is shorter). Up top it
// sat over centred header titles; down here only scrolling content passes
// under it. Toasts move up while it's showing (Toaster).
export const PILL_BOTTOM = 93;
// Raised: just under the reader's 60pt header, for while its comment sheet
// covers the bottom.
const PILL_RAISED_TOP = 60 + 8;

// Whether something at the bottom (the reader's comment sheet) has the
// pill moved to the top for now.
const usePillPlacement = create(() => ({ raised: false }));
export const raiseOfflinePill = (raised) => usePillPlacement.setState({ raised });

const OfflinePill = () => {
  const online = useConnectivityStore((s) => s.online);
  const catchingUp = useOutboxStore((s) => s.catchingUp);
  const raised = usePillPlacement((s) => s.raised);
  const insets = useSafeAreaInsets();
  const visible = !online || catchingUp;
  const opacity = useSharedValue(visible ? 1 : 0);
  const wasOnline = useRef(online);

  useEffect(() => {
    // A fade is already the Reduce Motion fallback, so it stays as it is.
    opacity.value = withTiming(visible ? 1 : 0, MOTION.quick);
    // VoiceOver hears the change, not the state it launched in (R2.4).
    if (online !== wasOnline.current) {
      AccessibilityInfo.announceForAccessibility(online ? 'Back online' : 'You\'re offline');
      wasOnline.current = online;
    }
  }, [online, visible, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Overlay style={Platform.OS === 'ios' ? undefined : StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={[styles.anchor, raised ? { top: insets.top + PILL_RAISED_TOP } : { bottom: PILL_BOTTOM }]}
        pointerEvents="none"
        testID="offline-pill-anchor"
      >
        {/* Hidden from VoiceOver: the announcement says it, and a focusable
            element in a window of its own would only get in the way. */}
        <Animated.View
          style={[styles.pill, fade]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="offline-pill"
        >
          <Icon
            name={online ? 'sync-outline' : 'cloud-offline-outline'}
            size={13}
            color={DS.colors.onSurfaceVariant}
          />
          <Text style={styles.label}>{online ? 'Syncing…' : 'Offline'}</Text>
        </Animated.View>
      </View>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerGlass,
  },
  label: {
    ...DS.type.meta,
    color: DS.colors.onSurface,
  },
});

export default OfflinePill;
