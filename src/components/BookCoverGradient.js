import { Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';

// Gradient placeholder cover used across Home/Reading/Rooms (1a/1b/1c) when a
// book has no real cover_image_url yet — a handful of moody duotones picked
// by title so the same book always lands on the same gradient. Mirrors the
// BUCKET_ICONS pattern in UserBuckets/CuratedBuckets (small local palette of
// raw hex, not DS tokens, since these are decorative variety, not semantic
// surface colors).
const GRADIENTS = [
  ['#2e3a54', '#151d32'],
  ['#41333f', '#1c1826'],
  ['#27403c', '#131f24'],
  ['#3a2e54', '#1d1532'],
];

const gradientFor = (title) => {
  if (!title) {
    return GRADIENTS[0];
  }
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
};

const BookCoverGradient = ({ coverUrl, title, width, height, borderRadius = 16, titleFontSize = 13, style }) => {
  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={[{ width, height, borderRadius }, style]}
        resizeMode="cover"
      />
    );
  }

  const [start, end] = gradientFor(title);

  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ width, height, borderRadius }, styles.gradient, style]}
    >
      <Text style={[styles.title, { fontSize: titleFontSize }]} numberOfLines={3}>
        {title}
      </Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    justifyContent: 'flex-end',
    padding: 10,
  },
  title: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    lineHeight: 16,
    color: DS.colors.onSurface + 'D9', // ~85%, matches the HTML's rgba(218,226,253,0.85)
  },
});

export default BookCoverGradient;
