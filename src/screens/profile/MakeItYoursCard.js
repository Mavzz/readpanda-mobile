import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';

const GRADIENT = [DS.colors.primary, DS.colors.primaryContainer];

// The new reader's checklist (PROFILE_SETTINGS_7a_7b.md § 7c). Steps are
// { key, title, subtitle, done, onPress }; the first one not done is "next"
// and carries the chevron. Hidden by the caller once everything is done.
const MakeItYoursCard = ({ steps }) => {
  const done = steps.filter((s) => s.done).length;
  const nextKey = steps.find((s) => !s.done)?.key;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Make it yours</Text>
        <Text style={styles.count}>{done} of {steps.length}</Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${(done / steps.length) * 100}%` }]}
        />
      </View>

      {steps.map((step) => {
        const isNext = step.key === nextKey;
        return (
          <Pressable
            key={step.key}
            onPress={step.onPress}
            disabled={step.done || !step.onPress}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done }}
          >
            {step.done ? (
              <LinearGradient colors={GRADIENT} style={styles.mark}>
                <Icon name="checkmark" size={15} color={DS.colors.onPrimary} />
              </LinearGradient>
            ) : (
              <View style={[styles.mark, styles.ring, isNext && styles.ringNext]} />
            )}
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, step.done && styles.rowTitleDone]} numberOfLines={1}>
                {step.title}
              </Text>
              {step.subtitle ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>{step.subtitle}</Text>
              ) : null}
            </View>
            {isNext ? <Icon name="chevron-forward" size={15} color={DS.colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    paddingTop: 16,
    paddingBottom: 6,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
  },
  count: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: DS.colors.surfaceContainerHighest,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring: {
    borderWidth: 2,
    borderColor: DS.colors.outlineVariant,
  },
  ringNext: {
    borderColor: DS.colors.primary,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  rowTitleDone: {
    color: DS.colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  rowSubtitle: {
    fontSize: 11,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
});

export default MakeItYoursCard;
