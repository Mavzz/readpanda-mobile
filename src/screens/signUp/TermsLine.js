import { Text, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import { openLegalPage } from '../../utils/legalLinks';

// The 18+ confirmation and agreement shown before an account is created
// (17a R7, legal-links R2). Continuing counts as confirming; there's no
// checkbox, so Apple and Google sign-in stay one tap.
const TermsLine = ({ style }) => (
  <Text style={[styles.text, style]}>
    By continuing you confirm you're 18 or older and agree to the{' '}
    <Text style={styles.link} onPress={() => openLegalPage('terms')} accessibilityRole="link">
      Terms
    </Text>
    {' '}and{' '}
    <Text style={styles.link} onPress={() => openLegalPage('privacy')} accessibilityRole="link">
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
