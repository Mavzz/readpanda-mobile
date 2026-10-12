import { View, StyleSheet } from 'react-native';
import { DS } from '../styles/global';

// Centers its children in a column no wider than a readable line (640pt by
// default, IPAD_AND_HOME_14_16.md § 1). On a phone the window is narrower
// than the cap, so this is a plain full-width View.
const ReadableColumn = ({ maxWidth = DS.layout.textMax, style, children }) => (
  <View style={[styles.column, { maxWidth }, style]}>{children}</View>
);

const styles = StyleSheet.create({
  column: {
    width: '100%',
    alignSelf: 'center',
  },
});

export default ReadableColumn;
