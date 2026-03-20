import { StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';

const Background = ({ children }) => (
  <LinearGradient
    colors={['#CFFF8D', '#FFFFFF']}
    style={styles.container}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default Background;
