import { View, Text, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import GradientPill from '../../components/GradientPill';

// The one hero slot at the top of Home — continue reading, a room waiting on
// a book, or first run. Same card and tilted cover each time; the lines under
// the title (`children`) and whatever sits under the CTA (`footer`) differ.
const HeroCard = ({ coverUrl, coverTitle, eyebrow, title, ctaLabel, onCta, children, footer }) => (
  <View style={styles.heroSection}>
    <View style={styles.heroCard}>
      <BookCoverGradient
        coverUrl={coverUrl}
        title={coverTitle}
        width={112}
        height={156}
        borderRadius={16}
        style={styles.heroCover}
      />
      <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
      {children}
    </View>
    <GradientPill onPress={onCta} style={styles.cta}>
      <Text style={styles.ctaText}>{ctaLabel}</Text>
    </GradientPill>
    {footer}
  </View>
);

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  heroCard: {
    position: 'relative',
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.hero,
    padding: 20,
    paddingLeft: 128,
    minHeight: 172,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  heroCover: {
    position: 'absolute',
    left: -8,
    top: -14,
    transform: [{ rotate: '-2deg' }],
    shadowColor: DS.colors.surfaceContainerLowest,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 10,
  },
  heroEyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
    lineHeight: 24,
    marginBottom: 4,
  },
  cta: {
    marginTop: 14,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default HeroCard;
