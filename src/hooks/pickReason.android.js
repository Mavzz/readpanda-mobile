import { pickOption } from '../components/SafetySheetHost';

// Android has no ActionSheetIOS; SafetySheetHost draws the reasons as a
// sheet. Resolves with the chosen id, or null.
const pickReason = (title, reasons) => pickOption(title, reasons);

export default pickReason;
