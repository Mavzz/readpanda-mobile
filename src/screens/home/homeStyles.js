import { StyleSheet } from 'react-native';
import { DS } from '../../styles/global';

// Styles more than one Home section uses. Anything used by one section lives
// in that section's own file.
const homeStyles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  section: {
    paddingTop: 26,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  // First-run / room-nudge hero: the subtitle and body copy that take the
  // place of the progress bar and friends row (see HeroCard).
  heroSubtitle: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
});

export default homeStyles;
