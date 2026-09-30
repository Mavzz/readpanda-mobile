import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';

// The reader's progress bar (6a). Sits on the chrome below the page rather
// than floating over it, so nothing covers the words being read.
//
// Ticks mark pages carrying comments the reader has unlocked. Two ticks closer
// together than this read as one smudge rather than two marks, so they merge.
const MIN_TICK_GAP_PCT = 4;

const mergeTicks = (pages, totalPages) => {
  if (!totalPages || totalPages <= 0) {
    return [];
  }
  const positions = [...new Set(pages || [])]
    .map((page) => (page / totalPages) * 100)
    .filter((pct) => pct >= 0 && pct <= 100)
    .sort((a, b) => a - b);

  return positions.reduce((kept, pct) => {
    if (kept.length === 0 || pct - kept[kept.length - 1] >= MIN_TICK_GAP_PCT) {
      kept.push(pct);
    }
    return kept;
  }, []);
};

const ReaderScrubber = ({ style, currentPage, totalPages, commentPages, waitingCount, lockedCount }) => {
  const ticks = useMemo(() => mergeTicks(commentPages, totalPages), [commentPages, totalPages]);
  const progressPct = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPct}%` }]} />
        {ticks.map((pct) => (
          <View key={pct} style={[styles.tick, { left: `${pct}%` }]} />
        ))}
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.pageCounter}>
          {currentPage + 1} / {totalPages}
        </Text>

        <View style={styles.waiting}>
          {waitingCount > 0 && (
            <>
              <Icon name="chatbubble" size={11} color={DS.colors.primary} />
              <Text style={styles.waitingText}>{waitingCount} waiting behind you</Text>
            </>
          )}
        </View>

        {/* Everything still ahead of the reader is one number and no more —
            no page, no preview. The server never sends anything else. */}
        <Text style={styles.locked}>
          {lockedCount > 0 ? `${lockedCount} later in the book` : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  track: {
    height: 3,
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.full,
  },
  fill: {
    height: 3,
    backgroundColor: DS.colors.primary,
    borderRadius: DS.radius.full,
  },
  tick: {
    position: 'absolute',
    top: -3.5,
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: DS.colors.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  // The three slots share the row evenly so the middle one stays centred even
  // when the outer two are different lengths.
  pageCounter: {
    flex: 1,
    fontFamily: DS.font.medium,
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waitingText: {
    fontFamily: DS.font.bold,
    fontSize: 11,
    color: DS.colors.primary,
  },
  locked: {
    flex: 1,
    fontFamily: DS.font.semibold,
    fontSize: 11,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'right',
  },
});

export default ReaderScrubber;
