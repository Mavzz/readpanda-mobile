import { Alert } from 'react-native';

// Android's alert takes three buttons, enough for these menus (two actions
// and Cancel). Resolves with the chosen id, or null.
const chooseAction = (title, options) =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ...options.slice(0, 2).map((o) => ({ text: o.label, onPress: () => resolve(o.id) })),
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });

export default chooseAction;
