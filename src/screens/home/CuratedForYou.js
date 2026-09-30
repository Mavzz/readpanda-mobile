import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import useAuthStore from '../../stores/authStore';
import useBucketsStore from '../../stores/bucketsStore';
import { seedCollection } from '../../utils/interests';
import homeStyles from './homeStyles';

// "Curated for you" cards are a fixed 58%/42% split of the section width.
// LinearGradient (the cover placeholder) needs a hard pixel height here —
// aspectRatio + a '100%' width + an undefined height doesn't resolve
// correctly for it and renders the cover hugely oversized with no title
// text, so the two card widths/heights are computed explicitly instead.
const SECTION_HPADDING = 24;
const CURATED_GAP = 12;
const CURATED_CARD_PADDING = 12;
const CURATED_COVER_ASPECT = 0.78; // width / height

const CuratedForYou = ({ isFirstRun, onOpenBucket, onSeeAll }) => {
  const { width: windowWidth } = useWindowDimensions();
  const preferences = useAuthStore((s) => s.user?.preferences);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);

  // Explicit pixel sizes for the cover, computed from the same 58%/42% split
  // the card containers use via CSS percentage.
  const curatedAvailableWidth = windowWidth - SECTION_HPADDING * 2 - CURATED_GAP;
  const curatedCoverSize = (isWide) => {
    const cardWidth = curatedAvailableWidth * (isWide ? 0.58 : 0.42);
    const coverWidth = cardWidth - CURATED_CARD_PADDING * 2;
    return { width: coverWidth, height: coverWidth / CURATED_COVER_ASPECT };
  };

  // On first run the first collection is interest-seeded and says so.
  const seededBucket = isFirstRun ? seedCollection(curatedBuckets, preferences).bucket : null;
  const curatedCards = (seededBucket
    ? [seededBucket, ...curatedBuckets.filter((b) => b.id !== seededBucket.id)]
    : curatedBuckets
  ).slice(0, 2);

  if (curatedCards.length === 0) {
    return null;
  }

  return (
    <View style={[homeStyles.section, styles.lastSection]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={homeStyles.sectionTitle}>Curated for you</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.curatedRow}>
        {curatedCards.map((bucket, i) => {
          const cover = curatedCoverSize(i === 0);
          const label = seededBucket && i === 0 ? 'From your interests' : bucket.name;
          return (
            <TouchableOpacity
              key={bucket.id}
              style={[styles.curatedCard, i === 0 ? styles.curatedCardWide : styles.curatedCardNarrow]}
              activeOpacity={0.85}
              onPress={() => onOpenBucket(bucket)}
            >
              <BookCoverGradient
                coverUrl={bucket.coverImageUrl || bucket.booksPreview?.[0]?.cover_image_url}
                title={bucket.name}
                width={cover.width}
                height={cover.height}
                borderRadius={16}
                titleFontSize={i === 0 ? 15 : 13}
                style={styles.curatedCover}
              />
              <Text style={styles.curatedLabel} numberOfLines={1}>{label}</Text>
              <Text style={styles.curatedCount}>
                {bucket.bookCount || 0} {bucket.bookCount === 1 ? 'book' : 'books'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lastSection: {
    paddingBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  seeAll: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  curatedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  curatedCard: {
    backgroundColor: DS.colors.surfaceContainerLow,
    borderRadius: DS.radius.md,
    padding: 12,
  },
  curatedCardWide: {
    width: '58%',
  },
  curatedCardNarrow: {
    width: '42%',
    alignSelf: 'flex-end',
  },
  curatedCover: {
    marginBottom: 10,
  },
  curatedLabel: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  curatedCount: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
  },
});

export default CuratedForYou;
