import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import CoverFan from '../components/CoverFan';
import useBucketsStore from '../stores/bucketsStore';
import useReadingProgressStore from '../stores/readingProgressStore';
import bucketProgress from '../utils/bucketProgress';
import { bucketMeta } from '../utils/readingTime';
import { CURATED_GROUND, HERO_FADE } from '../utils/covers';
import log from '../utils/logger';
import PressableScale from '../components/PressableScale';

// § 9b — a curated bucket, pushed from Discover (or first-run Home) over the
// tab bar. A full-bleed hero of its covers, the editorial line, a way to keep
// a copy, and every book in a two-column grid.
//
// Opened from a genre-filtered Discover, a "{Genre} · {m}" chip keeps the
// matching books first and dims the rest. Nothing is hidden, since the bucket
// is a curated whole. × clears it.
const HERO_HEIGHT = 330;
const GUTTER = 24;
const COLUMN_GAP = 14;

const CuratedBucketScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bucketId = route.params?.bucketId;

  const [page, setPage] = useState(null);
  const [genre, setGenre] = useState(route.params?.genre || null);
  const genreLabel = route.params?.genreLabel || genre;
  const [saving, setSaving] = useState(false);

  const fetchCuratedBucketBooks = useBucketsStore((s) => s.fetchCuratedBucketBooks);
  const saveCuratedBucket = useBucketsStore((s) => s.saveCuratedBucket);
  const shelf = useReadingProgressStore((s) => s.shelf);
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);

  useEffect(() => {
    fetchCuratedBucketBooks(bucketId).then(({ status, response }) => {
      if (status === 200) {
        setPage(response);
      } else {
        log.error('Could not load curated bucket', bucketId);
      }
    });
  }, [bucketId, fetchCuratedBucketBooks]);

  // Badges follow the reader: coming back from a book has to update them.
  useFocusEffect(
    useCallback(() => {
      loadShelf();
    }, [loadShelf]),
  );

  const books = useMemo(() => {
    const list = page?.books || [];
    if (!genre) {
      return list;
    }
    return [
      ...list.filter((b) => b.subgenre === genre),
      ...list.filter((b) => b.subgenre !== genre),
    ];
  }, [page, genre]);
  const matching = genre ? books.filter((b) => b.subgenre === genre).length : 0;

  const shelfById = useMemo(() => Object.fromEntries(shelf.map((b) => [b.id, b])), [shelf]);

  const name = page?.title || route.params?.name || '';
  const saved = !!page?.saved_bucket_id;
  const cellWidth = (width - GUTTER * 2 - COLUMN_GAP) / 2;

  const save = async () => {
    // Already saved: the copy is yours now, so go to it.
    if (saved) {
      navigation.popTo('Tabs', {
        screen: 'MyBooks',
        // initial: false keeps My Books' own list under the bucket, so Back
        // lands there rather than leaving the tab.
        params: { screen: 'MyBucket', initial: false, params: { bucketId: page.saved_bucket_id, name } },
      });
      return;
    }
    setSaving(true);
    const id = await saveCuratedBucket(bucketId);
    setSaving(false);
    if (id) {
      setPage((p) => ({ ...p, saved_bucket_id: id }));
    }
  };

  const header = (
    <View>
      {/* ── Hero ─────────────────────────────────────────── */}
      {/* Gradients stay childless: react-native-linear-gradient runs through
          Fabric's legacy interop, which mismanages nested children and
          crashed on pop ("Attempt to recycle a mounted view"). */}
      <View style={styles.hero}>
        <LinearGradient
          colors={CURATED_GROUND}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroGround, { width }]}
        />
        <View style={{ paddingTop: insets.top }}>
          <CoverFan
            layout="hero"
            covers={(page?.books || []).slice(0, 3)}
            seed={name}
            width={width}
            height={HERO_HEIGHT - insets.top - 40}
            coverWidth={84}
            coverHeight={122}
            centerWidth={88}
            centerHeight={128}
            offset={72}
            borderRadius={12}
          />
        </View>
        <LinearGradient
          colors={HERO_FADE}
          style={[styles.heroFade, { width }]}
          pointerEvents="none"
        />
      </View>

      {/* ── Info (overlaps the hero by 24) ───────────────── */}
      <View style={styles.info}>
        <View style={styles.eyebrowRow}>
          <Icon name="sparkles" size={12} color={DS.colors.primaryContainer} />
          <Text style={styles.eyebrow}>Curated</Text>
        </View>
        <Text style={styles.title}>{name}</Text>
        {page?.description ? <Text style={styles.description}>{page.description}</Text> : null}
        <View style={styles.saveRow}>
          <PressableScale
            onPress={save}
            disabled={saving || !page}
            style={[styles.savePill, saved && styles.savePillOn]}
            accessibilityRole="button"
            accessibilityHint={saved ? 'Opens your copy in My Books' : 'Copies this bucket into My Books'}
          >
            <Icon
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color={saved ? DS.colors.onPrimary : DS.colors.primary}
            />
            <Text style={[styles.saveText, saved && styles.saveTextOn]}>
              {saved ? 'Saved' : 'Save to My Books'}
            </Text>
          </PressableScale>
          {page ? (
            <Text style={styles.meta} numberOfLines={1}>
              {bucketMeta(page.book_count, page.reading_minutes)}
            </Text>
          ) : null}
        </View>

        {genre ? (
          <PressableScale
            onPress={() => setGenre(null)}
            style={styles.filterChip}
            accessibilityLabel={`Showing ${genreLabel} first. Clear`}
            accessibilityRole="button"
          >
            <Text style={styles.filterText}>{genreLabel} · {matching}</Text>
            <Icon name="close" size={14} color={DS.colors.onPrimary} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );

  const renderBook = ({ item: book }) => {
    const progress = bucketProgress(book, shelfById[book.book_id]);
    let badge = null;
    if (progress?.status === 'reading') {
      badge = `Reading · p. ${progress.page}`;
    } else if (progress?.status === 'finished') {
      badge = 'Finished';
    }
    const dimmed = genre && book.subgenre !== genre;
    return (
      <PressableScale
        cover
        onPress={() => navigation.navigate('BookDetail', { book })}
        style={[{ width: cellWidth }, dimmed && styles.dimmed]}
        accessibilityRole="button"
        accessibilityLabel={[book.title, book.author_name, badge].filter(Boolean).join(', ')}
      >
        <View>
          <BookCoverGradient
            coverUrl={book.cover_image_url}
            title={book.title}
            width={cellWidth}
            height={180}
            borderRadius={12}
            elevated
          />
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
        {book.author_name ? (
          <Text style={styles.bookAuthor} numberOfLines={1}>{book.author_name}</Text>
        ) : null}
      </PressableScale>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <FlatList
        data={books}
        keyExtractor={(b) => b.book_id}
        numColumns={2}
        renderItem={renderBook}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      {/* Floats over the hero. */}
      <PressableScale
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + 14 }]}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  back: {
    position: 'absolute',
    left: GUTTER,
    width: 38,
    height: 38,
    borderRadius: 19,
    // surface at 55%
    backgroundColor: DS.colors.background + '8C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  // Placed by top/left and explicit size: the interop view ignores `bottom`.
  heroGround: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: HERO_HEIGHT,
  },
  heroFade: {
    position: 'absolute',
    top: HERO_HEIGHT - 110,
    left: 0,
    height: 110,
  },

  // Info
  info: {
    marginTop: -24,
    paddingHorizontal: GUTTER,
    marginBottom: 20,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.primaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
  },
  description: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: 8,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  savePillOn: {
    backgroundColor: DS.colors.primary,
  },
  saveText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  saveTextOn: {
    color: DS.colors.onPrimary,
  },
  meta: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  filterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },

  // Grid
  columns: {
    paddingHorizontal: GUTTER,
    gap: COLUMN_GAP,
    marginBottom: 16,
  },
  dimmed: {
    opacity: 0.4,
  },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: DS.radius.full,
    // surface at 80%
    backgroundColor: DS.colors.background + 'CC',
  },
  badgeText: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  bookTitle: {
    fontSize: 13,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginTop: 8,
  },
  bookAuthor: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
});

export default CuratedBucketScreen;
