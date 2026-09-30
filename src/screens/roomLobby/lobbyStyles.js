import { StyleSheet } from 'react-native';
import { DS } from '../../styles/global';

// Styles every lobby section uses. Anything used by one section lives in that
// section's own file.
const lobbyStyles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 28,
  },
});

export default lobbyStyles;
