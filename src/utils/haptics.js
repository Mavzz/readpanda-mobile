import { trigger } from 'react-native-haptic-feedback';

// 12e haptics: light = select / toggle / chip · soft = an item lands somewhere
// · success = create, finish, join. None for navigation, scrolling or page
// turns. Haptics stay on under Reduce Motion.
const fire = (type) => trigger(type, { enableVibrateFallback: false });

const haptics = {
  light: () => fire('impactLight'),
  soft: () => fire('soft'),
  success: () => fire('notificationSuccess'),
};

export default haptics;
