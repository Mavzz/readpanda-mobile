import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import PickerSheet from './PickerSheet';
import PressableScale from './PressableScale';

// The top of every "See all" view (10c–10e): a back chevron, an optional sort
// pill and "+" on the right, then the section's title and a subtitle. The
// title is always the title of the section "See all" was tapped in.
//
// `sort` is { options: [{ value, label, icon }], value, onChange }; the pill
// shows the current option and opens a sheet of all of them.
const SeeAllHeader = ({ title, subtitle, sort, onAdd, addLabel = 'New' }) => {
  const navigation = useNavigation();
  const [sorting, setSorting] = useState(false);
  const current = sort?.options.find((o) => o.value === sort.value);

  return (
    <SafeAreaView edges={['top']}>
      <View style={styles.navRow}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.circle}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
        </PressableScale>
        <View style={styles.actions}>
          {current ? (
            <PressableScale
              onPress={() => setSorting(true)}
              style={styles.sortPill}
              accessibilityLabel={`Sort: ${current.label}`}
              accessibilityRole="button"
            >
              <Icon name="swap-vertical" size={14} color={DS.colors.onSurface} />
              <Text style={styles.sortText}>{current.label}</Text>
            </PressableScale>
          ) : null}
          {onAdd ? (
            <PressableScale
              onPress={onAdd}
              style={styles.circle}
              accessibilityLabel={addLabel}
              accessibilityRole="button"
            >
              <Icon name="add" size={21} color={DS.colors.primary} />
            </PressableScale>
          ) : null}
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {sort ? (
        <PickerSheet
          visible={sorting}
          title="Sort by"
          items={sort.options.map((o) => ({
            id: o.value,
            title: o.label,
            icon: o.icon,
            checked: o.value === sort.value,
          }))}
          onSelect={(item) => {
            setSorting(false);
            sort.onChange(item.id);
          }}
          onClose={() => setSorting(false)}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainer,
  },
  sortText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  title: {
    fontSize: 26,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 3,
  },
});

export default SeeAllHeader;
