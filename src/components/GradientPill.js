import { StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';
import PressableScale from './PressableScale';

// Gradient CTA pill (Home/Reading "continue" buttons, Rooms "New") — mirrors
// Button.js's primaryButton: the Pressable's own padding determines the
// size, and the gradient is an absolute-fill sibling behind the content,
// not a parent the content sizes itself through. Letting LinearGradient
// size itself via padding (as an earlier version of these screens did)
// rendered as a solid blank pill with no visible text/icon.
// 12d: disabled is never a filled pill — a disabled pill drops the gradient
// and the glow, and the caller colours its label DS.colors.disabled. Prefer
// not rendering a disabled primary at all (modals use a header text action).
const GradientPill = ({ onPress, children, style, disabled }) => (
  <PressableScale
    onPress={onPress}
    disabled={disabled}
    style={[styles.wrap, style, disabled && styles.disabled]}
  >
    {disabled ? null : (
      <LinearGradient
        colors={[DS.colors.primary, DS.colors.primaryContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />
    )}
    {children}
  </PressableScale>
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
  disabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default GradientPill;
