import { Text, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import { showToast } from '../../components/Toaster';
import useRoomStore from '../../stores/roomStore';
import PressableScale from '../../components/PressableScale';

// The creator deletes the room; everyone else can only leave it. Either way
// the room is gone from this reader's view, so `onGone` takes them out.
const DangerZone = ({ room, iAmCreator, onGone }) => {
  const deleteRoom = useRoomStore((s) => s.deleteRoom);
  const leaveRoom = useRoomStore((s) => s.leaveRoom);

  // Deleting a room takes everyone's membership with it, so confirm first.
  const handleDeleteRoom = () => {
    Alert.alert(
      'Delete room?',
      `"${room?.name}" and everyone's place in it will be removed. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { status, error } = await deleteRoom(room.id);
            if (status === 204) {
              showToast('Room deleted', 'success');
              onGone();
            } else {
              showToast(error || 'Could not delete the room', 'error');
            }
          },
        },
      ],
    );
  };

  const handleLeaveRoom = () => {
    Alert.alert(
      'Leave room?',
      `You'll stop seeing "${room?.name}". You can rejoin with the invite code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { status, error } = await leaveRoom(room.id);
            if (status === 204) {
              showToast('You left the room', 'success');
              onGone();
            } else {
              showToast(error || 'Could not leave the room', 'error');
            }
          },
        },
      ],
    );
  };

  return (
    <PressableScale
      onPress={iAmCreator ? handleDeleteRoom : handleLeaveRoom}
      style={styles.dangerAction}
    >
      <Icon
        name={iAmCreator ? 'trash-outline' : 'exit-outline'}
        size={16}
        color={DS.colors.error}
      />
      <Text style={styles.dangerActionText}>
        {iAmCreator ? 'Delete room' : 'Leave room'}
      </Text>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerLow,
  },
  dangerActionText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.error,
  },
});

export default DangerZone;
