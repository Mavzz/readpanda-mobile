import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';

const primaryButton = ({ onPress, title }) => (
  <Pressable onPress={onPress} style={styles.primaryWrapper}>
    <LinearGradient
      colors={[DS.colors.primary, DS.colors.primaryContainer]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.primaryGradient}
    >
      <Text style={styles.primaryText}>{title}</Text>
    </LinearGradient>
  </Pressable>
);

const ssoButton = ({ onPress, title }) => (
  <Pressable onPress={onPress} style={styles.ssoWrapper}>
    <Text style={styles.ssoText}>{title}</Text>
  </Pressable>
);

const signOutButton = ({ onPress }) => (
  <Pressable onPress={onPress}>
    <Icon name="log-out-outline" size={24} color={DS.colors.primary} />
  </Pressable>
);

const iconButton = ({ onPress, name, size, color, style }) => (
  <Pressable onPress={onPress} style={style}>
    <Icon name={name} size={size} color={color || DS.colors.onSurfaceVariant} />
  </Pressable>
);

const styles = StyleSheet.create({
  primaryWrapper: {
    borderRadius: DS.radius.full,
    marginBottom: 16,
  },
  primaryGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: DS.radius.full,
  },
  primaryText: {
    color: DS.colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  ssoWrapper: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    paddingVertical: 16,
    borderRadius: DS.radius.full,
    alignItems: 'center',
  },
  ssoText: {
    fontSize: 15,
    color: DS.colors.primary,
    fontWeight: '600',
  },
});

export { primaryButton, signOutButton, ssoButton, iconButton };
