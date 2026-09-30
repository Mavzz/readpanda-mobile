import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';

// Gradient CTA pill (Home/Reading "continue" buttons, Rooms "New") — mirrors
// Button.js's primaryButton: the Pressable's own padding determines the
// size, and the gradient is an absolute-fill sibling behind the content,
// not a parent the content sizes itself through. Letting LinearGradient
// size itself via padding (as an earlier version of these screens did)
// rendered as a solid blank pill with no visible text/icon.
const GradientPill = ({ onPress, children, style, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [styles.wrap, style, pressed && styles.pressed, disabled && styles.disabled]}
  >
    <LinearGradient
      colors={[DS.colors.primary, DS.colors.primaryContainer]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    />
    {children}
  </Pressable>
);

const styles = StyleSheet.create({
  wrap: {
    borderRadius: DS.radius.full,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: DS.colors.primaryContainer,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: DS.radius.full,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },
});

export default GradientPill;
