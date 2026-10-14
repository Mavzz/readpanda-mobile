import { View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';

const MAX_HEIGHT = 760;

// The iPad form sheet (IPAD_AND_HOME_14_16.md § 1, 15j): a centred 540pt card
// over the dimmed screen. Drawn here rather than by UIKit's .formSheet, which
// fixes the sheet near 540×620 while React Native lays the screen out at the
// window's full height — the content overflowed the sheet, cropping its
// footer and sliding its header under the title. On the phone it's a no-op:
// the screen is a full-screen takeover as before.
//
// The screen is presented as a transparent modal on iPad (MainStackNavigator)
// and wraps its content in this. Tapping outside the card closes it.
const FormSheetFrame = ({ onClose, children }) => {
  const { isLarge } = useLayout();
  const { height } = useWindowDimensions();
  if (!isLarge) {
    return children;
  }
  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.card, { height: Math.min(MAX_HEIGHT, height - 96) }]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS.colors.scrim,
  },
  card: {
    width: DS.layout.formSheet,
    borderRadius: DS.radius.hero,
    overflow: 'hidden',
    backgroundColor: DS.colors.background,
    // Ambient shadow per DESIGN.md.
    shadowColor: DS.colors.surfaceContainerLowest,
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 16,
  },
});

export default FormSheetFrame;
