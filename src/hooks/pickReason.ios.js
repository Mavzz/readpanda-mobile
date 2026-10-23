import { ActionSheetIOS } from 'react-native';

// The report reasons as a system action sheet, which presents over the
// native comment sheet too. Resolves with the chosen id, or null.
const pickReason = (title, reasons) =>
  new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        message: 'Why are you reporting this?',
        options: [...reasons.map((r) => r.label), 'Cancel'],
        cancelButtonIndex: reasons.length,
      },
      (index) => resolve(reasons[index]?.id || null),
    );
  });

export default pickReason;
