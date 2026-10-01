import { StyleSheet } from 'react-native';
import { DS } from '../../styles/global';

// Styles Profile (7a) and Settings (7b) share. Anything used by one screen
// lives in that screen's own file.
const profileStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  // The 38pt back / gear buttons in both screens' nav rows.
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // A grouped list card: Settings' groups and Profile's "Your rooms".
  groupCard: {
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: 22,
    overflow: 'hidden',
  },
});

export default profileStyles;
