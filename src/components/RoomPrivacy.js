import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import PressableScale from './PressableScale';

// Who can join a room (design_handoff § 2b). Create room and the room page's
// "Who can join" both draw these, so the two choices read the same in both.
export const ROOM_PRIVACY = {
  invite: {
    key: 'invite',
    icon: 'lock-closed',
    label: 'Invite only',
    body: 'Only people with your code can join.',
  },
  open: {
    key: 'open',
    icon: 'globe-outline',
    label: 'Open',
    body: 'Anyone on ReadPanda can find it.',
  },
};

export const privacyOptionFor = (isPrivate) =>
  (isPrivate === false ? ROOM_PRIVACY.open : ROOM_PRIVACY.invite);

export const PrivacyCard = ({ option, selected, onPress }) => (
  <PressableScale
    onPress={onPress}
    style={[
      styles.privacyCard,
      selected ? styles.privacyCardSelected : styles.privacyCardIdle,
    ]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    accessibilityLabel={`${option.label}. ${option.body}`}
  >
    <View style={styles.privacyHeader}>
      <Icon
        name={option.icon}
        size={15}
        color={selected ? DS.colors.primary : DS.colors.onSurfaceVariant}
      />
      <Text style={[styles.privacyLabel, selected ? styles.privacyLabelSelected : styles.privacyLabelIdle]}>
        {option.label}
      </Text>
    </View>
    <Text style={styles.privacyBody}>{option.body}</Text>
  </PressableScale>
);

const styles = StyleSheet.create({
  privacyCard: {
    flex: 1,
    borderRadius: DS.radius.comment,
  },
  // The selection ring is the one sanctioned stroke — it's a state, not a
  // divider. Padding drops to 12 so the 2px border doesn't shift content.
  privacyCardSelected: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: DS.colors.primary,
    padding: 12,
  },
  privacyCardIdle: {
    backgroundColor: DS.colors.surfaceContainerLow,
    padding: 14,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  privacyLabel: {
    fontSize: 13,
  },
  privacyLabelSelected: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  privacyLabelIdle: {
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  privacyBody: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 15,
    marginTop: 6,
  },
});
