import { View, Text, StyleSheet, ScrollView, StatusBar, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'react-native-linear-gradient';
import { useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from '../components/BookCoverGradient';
import GradientPill from '../components/GradientPill';
import useReadingProgressStore from '../stores/readingProgressStore';
import enhanceedStorage from '../utils/enhanceedStorage';
import relativeTime from '../utils/relativeTime';
import log from '../utils/logger';

// § 4b — a book being read alone. Deliberately none of the room view's social
// furniture: no "Where everyone is" track, no friend avatars, no comment feed,
// no unlock copy. A solo book never renders an empty version of those.
const SoloBookScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const bookId = route?.params?.bookId;

  const book = useReadingProgressStore((s) => s.shelf.find((b) => b.id === bookId));
  const loadShelf = useReadingProgressStore((s) => s.loadShelf);

  // The upsell shows once per book. Dismissing is per reader, so it rides in
  // the same scoped preferences the rest of the app uses.
  const upsellKey = `solo_upsell_dismissed_${bookId}`;
  const [upsellDismissed, setUpsellDismissed] = useState(
    () => !!enhanceedStorage.getUserPreference(upsellKey, false),
  );

  useEffect(() => {
    loadShelf();
  }, []);

  const dismissUpsell = () => {
    enhanceedStorage.storeUserPreference(upsellKey, true);
    setUpsellDismissed(true);
  };

  const continueReading = () => {
    if (!book) {
      return;
    }
    log.info('Continue pressed for solo book', book.title);
    navigation.navigate('ManuscriptScreen', {
      book: {
        book_id: book.id,
        title: book.title,
        cover_image_url: book.coverUrl,
        manuscript_url: book.manuscriptUrl,
      },
    });
  };

  // Create Room (2b), pre-seeded so the new room starts on this book and the
  // reader's progress carries straight over.
  const startARoom = () => {
    navigation.navigate('CreateRoomScreen', {
      seedBook: {
        book_id: book.id,
        title: book.title,
        cover_image_url: book.coverUrl,
        manuscript_url: book.manuscriptUrl,
      },
    });
  };

  const backButton = (
    <Pressable
      onPress={() => navigation.goBack()}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
    </Pressable>
  );

  // The book can be dropped while this screen is open. Fall back to the shelf
  // rather than render a header with nothing under it.
  if (!book) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <SafeAreaView edges={['top']}>
          <View style={styles.navRow}>{backButton}</View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView edges={['top']}>
        <View style={styles.navRow}>{backButton}</View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <BookCoverGradient
            coverUrl={book.coverUrl}
            title={book.title}
            width={96}
            height={136}
            borderRadius={14}
            style={styles.cover}
          />
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Reading solo</Text>
            <Text style={styles.title} numberOfLines={3}>{book.title}</Text>
            <Text style={styles.meta}>
              {book.started
                ? `Page ${book.chapter} of ${book.totalChapters} · ${book.progressPct}%`
                : 'Not started yet'}
            </Text>
          </View>
        </View>

        {/* ── Your pace ───────────────────────────────────────── */}
        <View style={styles.paceCard}>
          <View style={styles.paceHeader}>
            <Text style={styles.paceTitle}>Your pace</Text>
            <Text style={styles.paceWhen}>Last read {relativeTime(book.lastReadAt)}</Text>
          </View>
          <View style={styles.track}>
            <LinearGradient
              colors={[DS.colors.primary, DS.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { width: `${Math.max(book.progressPct, book.started ? 2 : 0)}%` }]}
            />
          </View>
          {/* The handoff's "About {est} left at your usual pace" needs a
              rolling reading-speed average, and nothing records one yet — the
              reading_sessions table is never written to. The spec says to omit
              the sentence when there's no history, so it is omitted rather
              than estimated from thin air. */}
          <Text style={styles.paceBody}>No one else can see this book&apos;s progress.</Text>
        </View>

        <GradientPill onPress={continueReading} style={styles.cta}>
          <Text style={styles.ctaText}>
            {book.started ? `Continue Page ${book.chapter}` : 'Start reading'}
          </Text>
        </GradientPill>

        {/* ── Better together ─────────────────────────────────── */}
        {!upsellDismissed && (
          <View style={styles.upsell}>
            <View style={styles.upsellIcon}>
              <Icon name="people-outline" size={15} color={DS.colors.primary} />
            </View>
            <Text style={styles.upsellBody}>
              Reading is better together — start a room with this book and your progress carries
              over.
            </Text>
            <Pressable
              onPress={startARoom}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityRole="button"
            >
              <Text style={styles.upsellAction}>Start a room</Text>
            </Pressable>
            <Pressable
              onPress={dismissUpsell}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              accessibilityLabel="Dismiss"
              accessibilityRole="button"
            >
              <Icon name="close" size={15} color={DS.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        )}
      </ScrollView>
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
  navRow: {
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  cover: {
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  title: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  meta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 6,
  },

  // Your pace
  paceCard: {
    marginHorizontal: 24,
    marginTop: 26,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 20,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  paceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
    gap: 12,
  },
  paceTitle: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  paceWhen: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  track: {
    height: 6,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
    overflow: 'hidden',
    marginBottom: 14,
  },
  fill: {
    height: '100%',
    borderRadius: DS.radius.full,
  },
  paceBody: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },

  // CTA
  cta: {
    marginHorizontal: 24,
    marginTop: 22,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },

  // Better together
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: DS.radius.comment,
    backgroundColor: DS.colors.surfaceContainerLow,
  },
  upsellIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upsellBody: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  upsellAction: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});

export default SoloBookScreen;
