import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { DS } from '../styles/global';
import { duotoneFor, COVER_SHADOW, SCRIM_COLORS } from '../utils/covers';

// The one cover primitive: a real cover image when the API gave us one, and
// otherwise the duotone placeholder from FIRST_RUN_3a_3b.md § "Cover fallback"
// — dark duotone hashed off the title (so a book keeps its colour between
// launches) with the title bottom-aligned in a serif. Never a gray box.
//
// Cover images are static, so they lean on the platform image caches (iOS
// NSURLCache / Android Fresco, both disk-backed) that RN's <Image> already
// uses; no extra image library is pulled in for that.
const BookCoverGradient = ({
  coverUrl,
  title,
  // Overrides `title` as the hash input for the duotone. Used where a slot has
  // no book of its own (an unfilled cover in a bucket's fanned stack) and so
  // needs a stable colour without a title to print.
  seed,
  width,
  height,
  borderRadius = 16,
  titleFontSize = 13,
  // Adds the handoff's 0/12/24 rgba(6,13,32,0.6) cover shadow so the cover
  // reads as a physical object on the dark surface.
  elevated = false,
  // Bottom scrim for tiles that print their label over the cover.
  scrim = false,
  style,
  children,
}) => {
  // Only label the placeholder when there's room for a line or two of it —
  // on small covers the title just got clipped by the bottom edge.
  // A caller that draws its own label over the cover (a collection tile, say)
  // supplies `children`; don't print the fallback title underneath it too.
  const showTitle = !!title && !children
    && (typeof height !== 'number' || height >= titleFontSize * 4);
  const box = { width, height, borderRadius };
  const overlay = (scrim || children) && (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { borderRadius }]}>
      {scrim && <LinearGradient colors={SCRIM_COLORS} style={StyleSheet.absoluteFill} />}
      {children}
    </View>
  );

  if (coverUrl) {
    return (
      <View style={[box, elevated && COVER_SHADOW, style]}>
        <Image source={{ uri: coverUrl }} style={[box, styles.flush]} resizeMode="cover" />
        {overlay}
      </View>
    );
  }

  const [start, end] = duotoneFor(seed || title);

  return (
    <View style={[box, elevated && COVER_SHADOW, style]}>
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[box, styles.flush, styles.gradient]}
      >
        {showTitle && (
          <Text
            style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.3) }]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        )}
      </LinearGradient>
      {overlay}
    </View>
  );
};

const styles = StyleSheet.create({
  // The image/gradient sits at 0,0 of the wrapper, and the wrapper is the one
  // that carries the shadow: on iOS a view that clips its children (which
  // anything rounding a cover has to do) can't also cast one.
  flush: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  gradient: {
    justifyContent: 'flex-end',
    padding: 10,
  },
  overlay: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  title: {
    fontFamily: 'Georgia',
    color: DS.colors.onSurface + 'D9', // ~85%, matches the HTML's rgba(218,226,253,0.85)
  },
});

export default BookCoverGradient;
