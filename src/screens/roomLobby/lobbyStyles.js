import { StyleSheet } from 'react-native';
import { DS } from '../../styles/global';

// Styles every lobby section uses. Anything used by one section lives in that
// section's own file.
const lobbyStyles = StyleSheet.create({
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
