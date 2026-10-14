import { View, Text, StyleSheet } from 'react-native';
import { DS } from '../styles/global';
import ProgressFill from './ProgressFill';

const DOT = 20;
const RING = 3;

// The Home hero's progress track with the room on it (16a): your fill, your
// avatar labelled "You", and the others at their own positions, so "ahead" is
// visible rather than just stated. Up to three avatars; with more members it
// keeps the two nearest ahead of you and counts the rest as "+N".
//
// `members` are { userId, initials, progressPct, isMe } — the same values the
// Room's "Where everyone is" uses, so the two agree.
const pickShown = (members) => {
  const me = members.find((m) => m.isMe);
  const others = members.filter((m) => !m.isMe);
  if (others.length <= 2) {
    return { shown: others, hidden: 0, me };
  }
  const myPct = me?.progressPct || 0;
  const ahead = others.filter((m) => m.progressPct > myPct).sort((a, b) => a.progressPct - b.progressPct);
  const behind = others.filter((m) => m.progressPct <= myPct).sort((a, b) => b.progressPct - a.progressPct);
  const shown = [...ahead, ...behind].slice(0, 2);
  return { shown, hidden: others.length - shown.length, me };
};

const FriendTrack = ({ members, myPct, seenKey, ringColor = DS.colors.surfaceContainer }) => {
  const { shown, hidden, me } = pickShown(members);
  const ring = { borderColor: ringColor };
  const place = (pct) => ({ left: `${Math.min(100, Math.max(0, pct))}%` });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`You're ${myPct}% in.${shown.length ? ` ${shown.map((m) => `${m.initials} ${m.progressPct}%`).join(', ')}.` : ''}`}
    >
      <View style={styles.trackArea}>
        <View style={styles.track}>
          <ProgressFill
            pct={myPct}
            seenKey={seenKey}
            colors={[DS.colors.primary, DS.colors.primaryContainer]}
            style={styles.fill}
          />
        </View>
        {shown.map((m) => (
          <View key={m.userId} style={[styles.dot, styles.dotOther, ring, place(m.progressPct)]}>
            <Text style={styles.dotText}>{m.initials}</Text>
          </View>
        ))}
        {me ? (
          <View style={[styles.dot, styles.dotMe, ring, place(myPct)]}>
            <Text style={styles.dotTextMe}>You</Text>
          </View>
        ) : null}
      </View>
      {hidden > 0 ? <Text style={styles.more}>+{hidden}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // One dot narrower than the row so a dot at 100% stays inside it.
  trackArea: {
    flex: 1,
    height: 28,
    marginRight: DOT,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: -DOT,
    top: 12,
    height: 5,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: DS.radius.full,
  },
  dot: {
    position: 'absolute',
    top: 4 - RING,
    width: DOT + RING * 2,
    height: DOT + RING * 2,
    borderRadius: (DOT + RING * 2) / 2,
    borderWidth: RING,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotMe: {
    backgroundColor: DS.colors.primary,
  },
  dotOther: {
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  dotText: {
    fontSize: 8,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  dotTextMe: {
    fontSize: 8,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  more: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default FriendTrack;
