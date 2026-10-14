import { Text, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import { showToast } from '../../components/Toaster';

// "By continuing you agree to the Terms and Privacy Policy." (17a, R7). The
// pages don't exist yet, so the links say so, as the Paywall's do; they need
// real pages before App Store submission.
const TermsLine = ({ style }) => (
  <Text style={[styles.text, style]}>
    By continuing you agree to the{' '}
    <Text style={styles.link} onPress={() => showToast('Terms are coming soon', 'info')} accessibilityRole="link">
      Terms
    </Text>
    {' '}and{' '}
    <Text style={styles.link} onPress={() => showToast('Privacy policy is coming soon', 'info')} accessibilityRole="link">
      Privacy Policy
    </Text>
    .
  </Text>
);

const styles = StyleSheet.create({
  text: {
    maxWidth: 300,
    alignSelf: 'center',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: DS.font.medium,
    color: DS.colors.body,
    textAlign: 'center',
  },
  link: {
    color: DS.colors.primary,
  },
});

export default TermsLine;
