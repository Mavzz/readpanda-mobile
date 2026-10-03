import { View, Text, StyleSheet } from 'react-native';
import { DS } from '../../styles/global';
import useReadingProgressStore from '../../stores/readingProgressStore';
import useCommentsStore from '../../stores/commentsStore';
import HeroCard from './HeroCard';
import ProgressFill from '../../components/ProgressFill';

// 1a — the book on the nightstand, how far in, and who in its room is ahead.
const ContinueReadingHero = ({ activeBook, onContinue }) => {
  const memberProgress = useReadingProgressStore((s) => s.memberProgress);
  // Scoped to the hero. This count is rendered inside the hero card beside
  // that book's friend avatars, so a global tally across every book on the
  // shelf would be describing the wrong book.
  const commentsWaiting = useCommentsStore(
    (s) => s.byBook[activeBook?.id]?.unreadCount || 0,
  );

  // Only the people genuinely further along than me — the caption claims they
  // are "ahead", so it must not fire for a room whose members are all sitting
  // at 0% because no one has recorded progress yet.
  const myPct = memberProgress.find((m) => m.isMe)?.progressPct ?? 0;
  const friends = memberProgress
    .filter((m) => !m.isMe && m.progressPct > myPct)
    .sort((a, b) => b.progressPct - a.progressPct);
  const friendNames = friends.length >= 2
    ? `${friends[0].initials} & ${friends[1].initials}`
    : friends[0]?.initials;

  return (
    <HeroCard
      coverUrl={activeBook.coverUrl}
      coverTitle={activeBook.title}
      eyebrow={activeBook.started ? 'Continue reading' : 'Start reading'}
      title={activeBook.title}
      ctaLabel={activeBook.started ? 'Pick up where you left off' : 'Start reading'}
      onCta={onContinue}
    >
      <Text style={styles.heroMeta}>
        {activeBook.started
          ? `${activeBook.unit === 'page' ? 'Page' : 'Chapter'} ${activeBook.chapter} of ${activeBook.totalChapters} · ${activeBook.progressPct}%`
          : 'Not started yet'}
        {activeBook.roomName ? ` · with ${activeBook.roomName}` : ''}
      </Text>
      <View style={styles.heroTrack}>
        <ProgressFill
          pct={activeBook.progressPct}
          seenKey={`book:${activeBook.id}`}
          colors={[DS.colors.primary, DS.colors.secondary]}
          style={styles.heroFill}
        />
      </View>
      {friends.length > 0 && (
        <View style={styles.friendsRow}>
          <View style={styles.avatarStack}>
            {friends.slice(0, 2).map((f, i) => (
              <View
                key={f.userId}
                style={[styles.friendAvatar, i > 0 && styles.friendAvatarOverlap]}
              >
                <Text style={styles.friendAvatarText}>{f.initials}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.friendsCaption}>
            {friendNames} {friends.length > 1 ? 'are' : 'is'} ahead — <Text style={styles.friendsHighlight}>{commentsWaiting} comments waiting</Text>
          </Text>
        </View>
      )}
    </HeroCard>
  );
};

const styles = StyleSheet.create({
  heroMeta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  heroTrack: {
    height: 4,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroFill: {
    height: '100%',
    borderRadius: DS.radius.full,
    shadowColor: DS.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
  },
  friendAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderWidth: 2,
    borderColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarOverlap: {
    marginLeft: -7,
  },
  friendAvatarText: {
    fontSize: 9,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  friendsCaption: {
    flex: 1,
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  friendsHighlight: {
    color: DS.colors.primary,
  },
});

export default ContinueReadingHero;
