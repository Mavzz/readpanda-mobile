import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import BookCoverGradient from '../../components/BookCoverGradient';
import GradientPill from '../../components/GradientPill';
import FriendTrack from '../../components/FriendTrack';
import useLayout from '../../hooks/useLayout';
import { firstName } from './homeCopy';

// "Priya & Tom are ahead" from the room's member names.
const aheadLine = (ahead, room) => {
  const nameOf = (m) => {
    const member = (room?.members || []).find((x) => (x.userId || x.user_id) === m.userId);
    return firstName(member?.name || member?.username || m.initials);
  };
  if (ahead.length === 0) {
    return null;
  }
  if (ahead.length === 1) {
    return `${nameOf(ahead[0])} is ahead`;
  }
  if (ahead.length === 2) {
    return `${nameOf(ahead[0])} & ${nameOf(ahead[1])} are ahead`;
  }
  return `${nameOf(ahead[0])} & ${ahead.length - 1} others are ahead`;
};

// The Continue hero (16a, 16c/16d on iPad): the book on the nightstand, how
// far in, the room's friends on the track, and the way back in. A solo book
// has no room chip and no track, just pace copy. `hero` is from
// useHomeSections.
const ContinueHero = ({ hero, onContinue }) => {
  const { isLarge } = useLayout();
  const { book, room, members, ahead } = hero;
  const ahd = room ? aheadLine(ahead, room) : null;
  const waitingLine = hero.waiting > 0
    ? `${hero.waiting} comment${hero.waiting === 1 ? '' : 's'} waiting${hero.waitingAt ? ` at p. ${hero.waitingAt}` : ''}`
    : null;

  const cta = (
    <GradientPill onPress={onContinue} style={[styles.cta, isLarge && styles.ctaLarge]}>
      <Icon name="play" size={15} color={DS.colors.onPrimary} />
      <Text style={styles.ctaText}>{book.started ? 'Continue reading' : 'Start reading'}</Text>
    </GradientPill>
  );

  return (
    <View style={[styles.card, isLarge && styles.cardLarge]}>
      <View style={styles.top}>
        <BookCoverGradient
          coverUrl={book.coverUrl}
          title={book.title}
          width={isLarge ? 138 : 96}
          height={isLarge ? 204 : 140}
          borderRadius={14}
          titleFontSize={12}
          elevated
        />
        <View style={styles.info}>
          {room ? (
            <View style={styles.chip}>
              <Icon name="people" size={11} color={DS.colors.primary} />
              <Text style={styles.chipText} numberOfLines={1}>{room.name}</Text>
            </View>
          ) : null}
          <Text style={[styles.title, isLarge && styles.titleLarge]} numberOfLines={2}>{book.title}</Text>
          <Text style={[styles.meta, isLarge && styles.metaLarge]}>{hero.place}</Text>
          {hero.timeLeft ? <Text style={[styles.meta, isLarge && styles.metaLarge]}>{hero.timeLeft}</Text> : null}
          {isLarge ? <View style={styles.ctaSlot}>{cta}</View> : null}
        </View>
      </View>

      {room && members.length > 0 ? (
        <View style={styles.social}>
          <FriendTrack members={members} myPct={book.progressPct} seenKey={`book:${book.id}`} />
          {ahd || waitingLine ? (
            <Text style={styles.socialLine}>
              {ahd}
              {ahd && waitingLine ? ' · ' : null}
              {waitingLine ? <Text style={styles.waiting}>{waitingLine}</Text> : null}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isLarge ? null : cta}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    gap: 16,
    borderRadius: DS.radius.hero,
    backgroundColor: DS.colors.surfaceContainer,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  cardLarge: {
    padding: 22,
  },
  top: {
    flexDirection: 'row',
    gap: 16,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  chipText: {
    flexShrink: 1,
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  title: {
    fontSize: 21,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
    lineHeight: 24,
    marginTop: 4,
  },
  titleLarge: {
    fontSize: 28,
    lineHeight: 32,
  },
  meta: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
  // 16c sets the iPad hero's place and pace a size up, 13/600.
  metaLarge: {
    fontSize: 13,
  },
  // iPad: the CTA hugs its label at the bottom of the text column.
  ctaSlot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingTop: 12,
  },
  social: {
    gap: 8,
  },
  socialLine: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
  waiting: {
    color: DS.colors.primary,
  },
  cta: {
    height: 50,
    paddingVertical: 0,
    gap: 8,
    shadowColor: DS.colors.primaryContainer,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  ctaLarge: {
    height: 48,
    paddingHorizontal: 24,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default ContinueHero;
