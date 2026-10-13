import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DS } from '../../styles/global';

// A Home section's title and its one link ("All rooms", "See all", "My
// Books"), per turn 16 — a 16pt title rather than the eyebrow the old Home
// used, since each section is now a destination of its own.
const SectionHeader = ({ title, link, onLink }) => (
  <View style={styles.header}>
    <Text style={styles.title}>{title}</Text>
    {link ? (
      <Pressable onPress={onLink} hitSlop={10} accessibilityRole="button">
        <Text style={styles.link}>{link}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.2,
  },
  link: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default SectionHeader;
