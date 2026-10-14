import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import PressableScale from '../../components/PressableScale';

// Apple and Google, above the email form (17a: stacked, full labels; iPad
// 17c/17d: side by side, "Apple" / "Google"). Apple's button follows its
// guidelines: white, with the black Apple logo — the one place this screen
// leaves the app's palette. Then the "or use email" divider.
const OneTapButtons = ({ sideBySide = false, busy, onApple, onGoogle }) => (
  <View style={styles.wrap}>
    <View style={[styles.buttons, sideBySide && styles.buttonsRow]}>
      <PressableScale
        onPress={onApple}
        disabled={!!busy}
        style={[styles.button, styles.apple, sideBySide && styles.buttonHalf]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
      >
        <Icon name="logo-apple" size={19} color={DS.colors.appleButtonText} />
        <Text style={styles.appleText}>{sideBySide ? 'Apple' : 'Continue with Apple'}</Text>
      </PressableScale>
      <PressableScale
        onPress={onGoogle}
        disabled={!!busy}
        style={[styles.button, styles.google, sideBySide && styles.buttonHalf]}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <Icon name="logo-google" size={17} color={DS.colors.onSurface} />
        <Text style={styles.googleText}>{sideBySide ? 'Google' : 'Continue with Google'}</Text>
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
  buttonsRow: {
    flexDirection: 'row',
  },
  button: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: DS.radius.full,
  },
  buttonHalf: {
    flex: 1,
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
