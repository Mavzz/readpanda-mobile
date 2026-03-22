import { View, StyleSheet } from 'react-native';
import { DS } from '../styles/global';

const Background = ({ children }) => (
  <View style={styles.container}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
});

export default Background;
