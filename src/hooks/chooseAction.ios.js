import { ActionSheetIOS } from 'react-native';

// A short menu (⋯ on a comment, a tapped member) as a system action sheet.
// options: [{ id, label, destructive? }]. Resolves with the id, or null.
const chooseAction = (title, options) =>
  new Promise((resolve) => {
    const destructive = options.map((o, i) => (o.destructive ? i : -1)).filter((i) => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((o) => o.label), 'Cancel'],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: destructive,
      },
      (index) => resolve(options[index]?.id || null),
    );
  });

export default chooseAction;
