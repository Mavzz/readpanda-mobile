import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import useSubscriptionStore from '../stores/subscriptionStore';
import useRoomStore from '../stores/roomStore';
import useBucketsStore from '../stores/bucketsStore';

// The free tier's limits (MONETIZATION doc § Feature split). The member cap
// has to be enforced by the API as well — a join happens on the joiner's
// device, where the host's plan isn't known.
export const FREE_LIMITS = {
  hostedRooms: 1,
  membersPerRoom: 5,
  customBuckets: 3,
};

const hostedRoomCount = (rooms) => rooms.filter(
  (room) => room.members.some((m) => m.isMe && m.isCreator),
).length;

// Whether the free tier covers this reason. Reasons with no limit (the
// Settings entry point) always pass; export is ReadPanda+ only.
const withinFreeTier = (reason, { rooms, customBuckets }) => {
  switch (reason) {
  case 'rooms': return hostedRoomCount(rooms) < FREE_LIMITS.hostedRooms;
  case 'buckets': return customBuckets.length < FREE_LIMITS.customBuckets;
  case 'export': return false;
  default: return true;
  }
};

// gate(reason, action): runs the action when the reader is within the free
// limits (or has ReadPanda+), otherwise opens the paywall with the reason,
// which picks its headline. Usage:
//   const gate = usePlusGate();
//   const createRoom = () => gate('rooms', () => navigation.navigate('CreateRoomScreen'));
const usePlusGate = () => {
  const navigation = useNavigation();
  const isPlus = useSubscriptionStore((s) => s.isPlus);
  const rooms = useRoomStore((s) => s.rooms);
  const customBuckets = useBucketsStore((s) => s.customBuckets);

  return useCallback((reason, action) => {
    if (isPlus || withinFreeTier(reason, { rooms, customBuckets })) {
      action();
      return;
    }
    navigation.navigate('Paywall', { reason });
  }, [isPlus, rooms, customBuckets, navigation]);
};

export default usePlusGate;
