import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import useLayout from '../../hooks/useLayout';

// "Your week" (16a): the streak as days, not just a number. Read days are
// filled amber, missed ones a dim brown, today a ring until you've read.
// Never shaming copy when the streak breaks — the footer only ever counts
// what was read. `week` is from useHomeSections.
const YourWeek = ({ week }) => {
  const { sizeClass } = useLayout();
  const { days, streak, pages, readToday } = week;
  // iPad portrait's half-width card has room for "6 days", not "6-day streak".
  const streakLabel = sizeClass === 'regular' ? `${streak} day${streak === 1 ? '' : 's'}` : `${streak}-day streak`;
  let footer = null;
  if (pages !== null) {
    footer = readToday
      ? `${pages} pages this week.`
      : `${pages} pages this week. Read tonight to make it ${streak + 1}.`;
  } else if (!readToday && streak > 0) {
    footer = `Read tonight to make it ${streak + 1}.`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Your week</Text>
        {streak > 0 ? (
          <View style={styles.streak}>
            <Icon name="flame" size={14} color={DS.colors.primary} />
            <Text style={styles.streakText}>{streakLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.days} accessible accessibilityLabel={`Read on ${days.filter((d) => d.read).length} of the last 7 days`}>
        {days.map((day) => {
          let dotStyle = styles.dotMissed;
          if (day.read) {
            dotStyle = styles.dotRead;
          } else if (day.isToday) {
            dotStyle = styles.dotToday;
          }
          return (
            <View key={day.key} style={styles.day}>
              <View style={[styles.dot, dotStyle]} />
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                {day.isToday ? 'Today' : day.letter}
              </Text>
            </View>
          );
        })}
      </View>

      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    borderRadius: 22,
    backgroundColor: DS.colors.surfaceContainer,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    ...DS.type.eyebrow,
    color: DS.colors.onSurfaceVariant,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 13,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  dotRead: {
    backgroundColor: DS.colors.primaryContainer,
  },
  dotMissed: {
    backgroundColor: DS.colors.streakMissed,
  },
  dotToday: {
    borderWidth: 2,
    borderColor: DS.colors.primaryContainer,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  dayLabelToday: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  footer: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
});

export default YourWeek;
