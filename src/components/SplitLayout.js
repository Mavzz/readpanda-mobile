import { View, StyleSheet } from 'react-native';
import useLayout from '../hooks/useLayout';

// The iPad two-column page (IPAD_AND_HOME_14_16.md § 1): side by side on the
// layouts named in `splitOn`, stacked left-over-right everywhere else, so the
// phone and narrow multitasking windows keep their single column.
//
// Columns are either proportional (`ratio`, e.g. [7, 5] for Home or [3, 2]
// for the 60/40 pages) or a fixed left column (`leftWidth`, e.g. 320 for the
// detail pages' identity side) with the right one taking the rest, capped at
// `rightMaxWidth`.
const SplitLayout = ({
  left,
  right,
  ratio = [3, 2],
  leftWidth,
  rightMaxWidth,
  gap = 20,
  splitOn = ['wide'],
  style,
}) => {
  const { sizeClass } = useLayout();

  if (!splitOn.includes(sizeClass)) {
    return (
      <View style={[styles.stack, { gap }, style]}>
        {left}
        {right}
      </View>
    );
  }

  const leftStyle = leftWidth ? { width: leftWidth } : { flex: ratio[0] };
  const rightStyle = leftWidth ? styles.fill : { flex: ratio[1] };

  return (
    <View style={[styles.row, { gap }, style]}>
      <View style={[styles.column, leftStyle]}>{left}</View>
      <View style={[styles.column, rightStyle, rightMaxWidth && { maxWidth: rightMaxWidth }]}>
        {right}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // minWidth 0 is the RN equivalent of the handoff's minmax(0, …): long text
  // wraps inside its column instead of pushing the other one off screen.
  column: {
    minWidth: 0,
  },
  fill: {
    flex: 1,
  },
});

export default SplitLayout;
