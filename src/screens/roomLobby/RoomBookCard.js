import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import { bookIdOf } from './roomLobbyFormat';
import PressableScale from '../../components/PressableScale';
import ProgressFill from '../../components/ProgressFill';

// STATE B / C — the cover-led progress hero from § 1b. Tapping it starts (or
// resumes) the book in the reader.
const RoomBookCard = ({
  coverUrl,
  bookTitle,
  bucket,
  upNext,
  shownPct,
  progressKey,
  progressLabel,
  bookLocked,
  // Only the room's creator decides what it reads (the API enforces it too).
  canEdit,
  onStartReading,
  onSwapBook,
  onAddBucket,
}) => (
  <>
    <PressableScale
      onPress={onStartReading}
      style={styles.bookHero}
      accessibilityLabel={`Start reading ${bookTitle}`}
      accessibilityRole="button"
    >
      <BookCoverGradient
        coverUrl={coverUrl}
        title={bookTitle}
        width={72}
        height={100}
        borderRadius={14}
        titleFontSize={10}
      />
      <View style={styles.bookHeroText}>
        <Text style={styles.bookHeroTitle} numberOfLines={2}>{bookTitle}</Text>
        <Text style={styles.bookHeroMeta}>{progressLabel}</Text>
        <View style={styles.progressTrack}>
          <ProgressFill pct={shownPct} seenKey={progressKey} style={styles.progressFill} />
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color={DS.colors.onSurfaceVariant} />
    </PressableScale>

    {bookLocked && (
      <View style={styles.lockedRow}>
        <Icon name="lock-closed" size={13} color={DS.colors.onSurfaceVariant} />
        <Text style={styles.lockedRowText}>
          Reading has started — this book is locked for the room
        </Text>
      </View>
    )}

    {bucket ? (
      /* STATE B — reading through a bucket: what's queued after this */
      upNext.length > 0 && (
        <View style={styles.upNext}>
          <Text style={styles.upNextEyebrow} numberOfLines={1}>
            Up next in {bucket.name}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.upNextRow}
          >
            {upNext.map((book) => (
              <PressableScale
                key={bookIdOf(book)}
                onPress={() => onSwapBook(book)}
                disabled={bookLocked || !canEdit}
                style={[
                  (bookLocked || !canEdit) && styles.upNextLocked,
                ]}
                accessibilityLabel={bookLocked
                  ? `${book.title}, queued — the room's book is locked`
                  : canEdit
                    ? `Read ${book.title} next`
                    : `${book.title}, queued`}
                accessibilityRole="button"
              >
                <BookCoverGradient
                  coverUrl={book.cover_image_url}
                  title={book.title}
                  width={44}
                  height={62}
                  borderRadius={10}
                  titleFontSize={7}
                />
              </PressableScale>
            ))}
            <View style={styles.upNextChip}>
              <Text style={styles.upNextChipText}>{upNext.length} left</Text>
            </View>
          </ScrollView>
        </View>
      )
    ) : (
      /* STATE C — standalone book: let the room graduate to a list.
         Not once reading has started: picking a book from the new
         bucket is what changes the room's current book. */
      !bookLocked && canEdit && (
        <PressableScale
          onPress={onAddBucket}
          style={styles.addBucket}
        >
          <Text style={styles.addBucketText}>Add a bucket</Text>
        </PressableScale>
      )
    )}
  </>
);

const styles = StyleSheet.create({
  bookHero: {
    flexDirection: 'row',
    // Centred so the "start reading" chevron lines up with the cover.
    alignItems: 'center',
    gap: 16,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 18,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  bookHeroText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  bookHeroTitle: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  bookHeroMeta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primary,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  lockedRowText: {
    flex: 1,
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },

  // Up next (bucket queue)
  upNext: {
    marginTop: 16,
  },
  upNextEyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  upNextLocked: {
    opacity: 0.55,
  },
  upNextChip: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  upNextChipText: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },

  // Standalone book — graduate to a reading list
  addBucket: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addBucketText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default RoomBookCard;
