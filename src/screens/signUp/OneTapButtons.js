import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import PressableScale from '../../components/PressableScale';
import GoogleLogo from '../../components/GoogleLogo';

// Apple and Google, above the email form: stacked, with the full "Continue
// with …" labels on every size, since Apple's and Google's branding rules
// don't allow a bare "Apple" / "Google" (R1.1). Apple's button is white with
// the black logo and Google's carries its four-colour G — the one place these
// screens leave the app's palette. Then the "or use email" divider.
const OneTapButtons = ({ busy, onApple, onGoogle }) => (
  <View style={styles.wrap}>
    <View style={styles.buttons}>
      <PressableScale
        onPress={onApple}
        disabled={!!busy}
        style={[styles.button, styles.apple]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
      >
        <Icon name="logo-apple" size={19} color={DS.colors.appleButtonText} />
        <Text style={styles.appleText}>Continue with Apple</Text>
      </PressableScale>
      <PressableScale
        onPress={onGoogle}
        disabled={!!busy}
        style={[styles.button, styles.google]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <GoogleLogo size={18} />
        <Text style={styles.googleText}>Continue with Google</Text>
      </PressableScale>
    </View>
    <View style={styles.divider}>
      <View style={styles.rule} />
      <Text style={styles.or}>or use email</Text>
      <View style={styles.rule} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    gap: 22,
  },
  buttons: {
    gap: 10,
  },
  button: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: DS.radius.full,
  },
  apple: {
    backgroundColor: DS.colors.appleButton,
  },
  appleText: {
    fontSize: 16,
    fontFamily: DS.font.bold,
    color: DS.colors.appleButtonText,
  },
  google: {
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  googleText: {
    fontSize: 16,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: DS.colors.outlineVariant,
    opacity: 0.5,
  },
  or: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.body,
  },
});

export default OneTapButtons;
