import { Children, Fragment } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import profileStyles from './profileStyles';

// Row anatomy from PROFILE_SETTINGS_7a_7b.md: icon + label + current value +
// chevron, so a row says what it's set to without being opened. A row with a
// `switch` toggles in place instead and has no chevron.
export const SettingsRow = ({ icon, label, value, onPress, switchValue, onSwitchChange }) => {
  const hasSwitch = typeof switchValue === 'boolean';
  return (
    <Pressable
      onPress={hasSwitch ? () => onSwitchChange(!switchValue) : onPress}
      disabled={!hasSwitch && !onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole={hasSwitch ? 'switch' : 'button'}
      accessibilityState={hasSwitch ? { checked: switchValue } : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      <Icon name={icon} size={18} color={DS.colors.primary} />
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {hasSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: DS.colors.surfaceContainerHighest, true: DS.colors.primaryContainer }}
          thumbColor={DS.colors.onSurface}
          ios_backgroundColor={DS.colors.surfaceContainerHighest}
        />
      ) : (
        <Icon name="chevron-forward" size={15} color={DS.colors.onSurfaceVariant} />
      )}
    </Pressable>
  );
};

// An eyebrow over a card of rows, with inset dividers between them.
export const SettingsGroup = ({ title, children }) => {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <Text style={[profileStyles.eyebrow, styles.groupTitle]}>{title}</Text> : null}
      <View style={profileStyles.groupCard}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    marginTop: 24,
  },
  groupTitle: {
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
  },
  value: {
    maxWidth: '45%',
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },
  // Starts under the label, past the icon: 16 padding + 18 icon + 12 gap.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
    backgroundColor: DS.colors.outlineVariant,
  },
});
