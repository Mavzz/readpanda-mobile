import { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import { showToast } from '../../components/Toaster';
import PressableScale from '../../components/PressableScale';
import { ROOM_PRIVACY, PrivacyCard, privacyOptionFor } from '../../components/RoomPrivacy';
import useRoomStore from '../../stores/roomStore';
import useLayout from '../../hooks/useLayout';
import haptics from '../../utils/haptics';

// Who can join (specs/open-rooms R6). The creator can switch the room between
// Invite only and Open with the same two cards as Create room; everyone else
// just sees which it is. The store applies the change at once and puts it
// back if the API refuses.
const WhoCanJoin = ({ room, iAmCreator, style }) => {
  const { isLarge } = useLayout();
  const setRoomPrivacy = useRoomStore((s) => s.setRoomPrivacy);
  const [choosing, setChoosing] = useState(false);
  const current = privacyOptionFor(room?.isPrivate);

  const choose = async (option) => {
    setChoosing(false);
    if (option.key === current.key || !room?.id) {
      return;
    }
    haptics.light();
    const { status } = await setRoomPrivacy(room.id, option.key === ROOM_PRIVACY.invite.key);
    if (status !== 200) {
      showToast('Couldn\'t change who can join', 'error');
    }
  };

  const value = (
    <View style={styles.valueRow}>
      <Icon name={current.icon} size={15} color={DS.colors.onSurfaceVariant} />
      <Text style={styles.value} numberOfLines={1}>{current.label}</Text>
    </View>
  );

  if (!iAmCreator) {
    return (
      <View
        style={[styles.row, style]}
        accessible
        accessibilityLabel={`Who can join: ${current.label}`}
      >
        <Text style={styles.label}>Who can join</Text>
        {value}
      </View>
    );
  }

  return (
    <>
      <PressableScale
        onPress={() => setChoosing(true)}
        style={[styles.row, style]}
        accessibilityRole="button"
        accessibilityLabel="Who can join"
        accessibilityValue={{ text: current.label }}
      >
        <Text style={styles.label}>Who can join</Text>
        <View style={styles.valueRow}>
          {value}
          <Icon name="chevron-forward" size={16} color={DS.colors.onSurfaceVariant} />
        </View>
      </PressableScale>

      <Modal visible={choosing} animationType="slide" transparent onRequestClose={() => setChoosing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setChoosing(false)} accessibilityLabel="Close">
          <Pressable style={[styles.sheet, isLarge && styles.sheetLarge]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} accessibilityRole="header">Who can join</Text>
              <PressableScale
                onPress={() => setChoosing(false)}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Icon name="close" size={20} color={DS.colors.onSurfaceVariant} />
              </PressableScale>
            </View>
            <View style={styles.cards}>
              {[ROOM_PRIVACY.invite, ROOM_PRIVACY.open].map((option) => (
                <PrivacyCard
                  key={option.key}
                  option={option}
                  selected={option.key === current.key}
                  onPress={() => choose(option)}
                />
              ))}
            </View>
            <Text style={styles.caption}>
              Everyone already in the room stays, and the invite code keeps working.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  value: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
    flexShrink: 1,
  },

  backdrop: {
    flex: 1,
    backgroundColor: DS.colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderTopLeftRadius: DS.radius.lg,
    borderTopRightRadius: DS.radius.lg,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sheetLarge: {
    width: '100%',
    maxWidth: DS.layout.sheetMax,
    alignSelf: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cards: {
    flexDirection: 'row',
    gap: 10,
  },
  caption: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 14,
  },
});

export default WhoCanJoin;
