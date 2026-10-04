import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import GradientPill from './GradientPill';
import { duotoneFor, COVER_SHADOW } from '../utils/covers';
import PressableScale from './PressableScale';

// § 3b — nothing read yet. My Books (8b) shows it in place of "Currently
// reading", and the full shelf falls back to it if its last book goes. "Pick a
// book" opens Discover, the one place for finding books.
const FirstRunShelf = ({ onPickABook, onJoinByCode, style }) => (
  <View style={[styles.container, style]}>
    {/* Pure decoration — two tilted covers, no book behind them. */}
    <View style={styles.illustration}>
      <LinearGradient
        colors={duotoneFor('nightstand-left')}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.illustrationCover, styles.illustrationLeft]}
      />
      <LinearGradient
        colors={duotoneFor('nightstand-right')}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.illustrationCover, styles.illustrationRight]}
      >
        <Icon name="moon-outline" size={26} color={DS.colors.primary} />
      </LinearGradient>
    </View>

    <Text style={styles.title}>Nothing on your nightstand yet</Text>
    <Text style={styles.body}>
      Pick a book and it lands here — your progress, your friends&apos; pace, and their
      comments unlocking as you go.
    </Text>

    <GradientPill onPress={onPickABook} style={styles.cta}>
      <Text style={styles.ctaText}>Pick a book</Text>
    </GradientPill>

    <PressableScale
      onPress={onJoinByCode}
      style={styles.link}
    >
      <Text style={styles.linkText}>Have an invite code? Join a room</Text>
    </PressableScale>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustration: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  illustrationCover: {
    width: 78,
    height: 110,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...COVER_SHADOW,
  },
  illustrationLeft: {
    transform: [{ rotate: '-7deg' }],
  },
  illustrationRight: {
    marginLeft: -14,
    transform: [{ rotate: '5deg' }],
  },
  title: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 10,
  },
  body: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  cta: {
    alignSelf: 'stretch',
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default FirstRunShelf;
