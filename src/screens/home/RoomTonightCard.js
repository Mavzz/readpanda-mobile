import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import PressableScale from '../../components/PressableScale';

const DAY = 24 * 60 * 60 * 1000;

// "Ch. 4 due in 3 days" / "due Sun" — days, never hours (widgets 13b too).
const dueLine = (schedule, now = Date.now()) => {
  const days = Math.ceil((schedule.dueAt - now) / DAY);
  if (days <= 0) {
    return `p. ${schedule.targetPage} due today`;
  }
  if (days === 1) {
    return `p. ${schedule.targetPage} due tomorrow`;
  }
  if (days < 7) {
    return `p. ${schedule.targetPage} due in ${days} days`;
  }
  return `p. ${schedule.targetPage} due ${new Date(schedule.dueAt).toLocaleDateString(undefined, { weekday: 'short' })}`;
};

// Who's already into the room's book you haven't opened: the one furthest
// in, by name, so it reads as a nudge rather than a count. Under 1% still
// reads as started.
export const startedLine = (readers) => {
  const ahead = [...readers].sort((a, b) => b.progressPct - a.progressPct);
  const first = ahead[0];
  if (!first) {
    return '';
  }
  const pct = Math.max(1, Math.round(first.progressPct));
  const who = first.name || 'Someone';
  const rest = ahead.length - 1;
  if (rest === 0) {
    return `${who} is ${pct}% in`;
  }
  return `${who} is ${pct}% in · ${rest} more reading`;
};

const Avatars = ({ members }) => (
  <View style={styles.avatars}>
    {members.slice(0, 3).map((m, i) => (
      <View key={m.userId} style={[styles.avatar, i > 0 && styles.avatarOverlap]}>
        <Text style={styles.avatarText}>{m.initials}</Text>
      </View>
    ))}
  </View>
);

const Pill = ({ icon, label, onPress }) => (
  <PressableScale onPress={onPress} style={styles.pill} accessibilityRole="button">
    <Icon name={icon} size={icon === 'add' ? 13 : 11} color={DS.colors.primary} />
    <Text style={styles.pillText}>{label}</Text>
  </PressableScale>
);

// One room in Rooms tonight (16e), in whichever of the four states it's in:
//   together    reading it, on a schedule — the bar, the deadline tick, who's ahead
//   notStarted  the room's book, not opened yet — Start opens the reader at p. 1
//   noBook      nothing picked — Choose the book opens the Room
//   noSchedule  reading it, no deadlines — the book's name only
// Every room has a schedule-less state while schedules are on hold (turn 18).
// `item` is one of useHomeSections' roomsTonight. Phone: a 250pt card. iPad:
// a row inside one shared card (`inList`).
const RoomTonightCard = ({ item, onOpen, onStart, inList = false }) => {
  const { room, state, schedule, bookTitle, unread, members, myPct } = item;
  const others = members.filter((m) => !m.isMe);
  const ahead = others.filter((m) => m.progressPct > myPct);
  const started = others.filter((m) => m.progressPct > 0);
  const nudge = state === 'notStarted' ? startedLine(started) : '';

  let detail = bookTitle;
  if (state === 'noBook') {
    detail = 'No book picked yet';
  } else if (schedule) {
    detail = `${bookTitle} · ${dueLine(schedule)}`;
  }

  return (
    <PressableScale
      onPress={() => onOpen(room)}
      style={inList ? styles.row : styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${room.name}, ${detail}${nudge ? `, ${nudge}` : ''}${unread ? `, ${unread} new` : ''}`}
    >
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{room.name}</Text>
        {state !== 'noBook' ? (
          <Text style={unread > 0 ? styles.unread : styles.caughtUp}>
            {unread > 0 ? `${unread} new` : 'Caught up'}
          </Text>
        ) : null}
      </View>
      {inList && (state === 'notStarted' || state === 'noBook') ? (
        // In the iPad list the pill sits beside the line it acts on, so a
        // room is two lines, not three.
        <View style={[styles.footer, styles.footerSpread]}>
          <Text style={[styles.detail, styles.detailBeside]} numberOfLines={1}>{detail}</Text>
          {state === 'notStarted'
            ? <Pill icon="play" label="Start" onPress={() => onStart(room)} />
            : <Pill icon="add" label="Choose the book" onPress={() => onOpen(room)} />}
        </View>
      ) : (
        <Text style={styles.detail} numberOfLines={1}>{detail}</Text>
      )}

      {state === 'together' && schedule ? (
        <>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${myPct}%` }]} />
            <View style={[styles.tick, { left: `${Math.min(100, (schedule.targetPage / Math.max(1, item.totalPages || schedule.targetPage)) * 100)}%` }]} />
          </View>
          {others.length > 0 ? (
            <View style={styles.footer}>
              <Avatars members={others} />
              <Text style={styles.footerText}>{ahead.length} of {others.length} ahead of you</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {state === 'notStarted' && inList && nudge ? (
        <View style={styles.footer}>
          <Avatars members={started} />
          <Text style={[styles.footerText, styles.nudge]} numberOfLines={1}>{nudge}</Text>
        </View>
      ) : null}

      {state === 'notStarted' && !inList ? (
        <View style={[styles.footer, styles.footerSpread]}>
          {nudge ? (
            <View style={[styles.footer, styles.nudgeWrap]}>
              <Avatars members={started} />
              <Text style={[styles.footerText, styles.nudge]} numberOfLines={1}>{nudge}</Text>
            </View>
          ) : <View />}
          <Pill icon="play" label="Start" onPress={() => onStart(room)} />
        </View>
      ) : null}

      {state === 'noBook' && !inList ? (
        <Pill icon="add" label="Choose the book" onPress={() => onOpen(room)} />
      ) : null}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 250,
    padding: 14,
    gap: 10,
    borderRadius: 22,
    backgroundColor: DS.colors.surfaceContainer,
  },
  row: {
    paddingVertical: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    flex: 1,
    ...DS.type.rowTitle,
    color: DS.colors.onSurface,
  },
  unread: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.primaryContainer,
  },
  caughtUp: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  detail: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
  detailBeside: {
    flex: 1,
    minWidth: 0,
  },
  track: {
    height: 5,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
  },
  fill: {
    height: '100%',
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primaryContainer,
  },
  // The deadline, as a white tick across the bar.
  tick: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 11,
    borderRadius: 1,
    backgroundColor: DS.colors.onSurface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerSpread: {
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  // A long name gives way to the Start pill rather than pushing it off.
  nudgeWrap: {
    flex: 1,
  },
  nudge: {
    flexShrink: 1,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: DS.colors.surfaceContainer,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlap: {
    marginLeft: -7,
  },
  avatarText: {
    fontSize: 8,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  pillText: {
    fontSize: 12,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
});

export default RoomTonightCard;
