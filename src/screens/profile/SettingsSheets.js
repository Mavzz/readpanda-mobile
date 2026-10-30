import { useState } from 'react';
import {
  View, Text, TextInput, Image, StyleSheet, Modal, Pressable, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { DS } from '../../styles/global';
import profileStyles from './profileStyles';
import PressableScale from '../../components/PressableScale';
import { sendBugReport } from '../../utils/sentry';
import log from '../../utils/logger';

// avoidKeyboard is for sheets with a text field, so they rise above the
// keyboard instead of being covered by it.
const Sheet = ({ visible, onClose, avoidKeyboard = false, children }) => {
  const body = (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.grabber} />
        {children}
      </Pressable>
    </Pressable>
  );
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior="padding">
          {body}
        </KeyboardAvoidingView>
      ) : body}
    </Modal>
  );
};

// Pick one of a setting's options. Choosing closes the sheet.
export const ChoiceSheet = ({ visible, title, options = [], value, onSelect, onClose }) => (
  <Sheet visible={visible} onClose={onClose}>
    <Text style={styles.title}>{title}</Text>
    <View style={[profileStyles.groupCard, styles.options]}>
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <View key={option.value}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
              {selected ? <Icon name="checkmark" size={18} color={DS.colors.primary} /> : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  </Sheet>
);

// A question with a confirm button that carries the action's own colour
// (neither is the gradient CTA) and a way back. `children` goes under the
// message (Delete account's ReadPanda+ note). While `busy` the confirm button
// shows a spinner and nothing takes a tap, so the action can't run twice or be
// walked away from halfway (account-deletion R3.3). Split out of ConfirmSheet
// so the bug report can ask inside its own Modal.
const ConfirmBody = ({
  title, message, confirmLabel, cancelLabel = 'Cancel', destructive, busy = false, onConfirm, onCancel,
  children,
}) => (
  <>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {children}
    <PressableScale
      onPress={onConfirm}
      disabled={busy}
      style={[styles.button, styles.confirmButton]}
      accessibilityRole="button"
      accessibilityLabel={confirmLabel}
      accessibilityState={{ busy, disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator color={destructive ? DS.colors.error : DS.colors.onSurface} />
      ) : (
        <Text style={[styles.buttonText, destructive && styles.destructiveText]}>{confirmLabel}</Text>
      )}
    </PressableScale>
    <PressableScale
      onPress={onCancel}
      disabled={busy}
      style={[styles.button, busy && styles.buttonInactive]}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
    >
      <Text style={[styles.buttonText, styles.cancelText]}>{cancelLabel}</Text>
    </PressableScale>
  </>
);

// Sign out / Delete account.
export const ConfirmSheet = ({ visible, busy = false, onClose, ...body }) => (
  <Sheet visible={visible} onClose={busy ? () => {} : onClose}>
    <ConfirmBody {...body} busy={busy} onCancel={onClose} />
  </Sheet>
);

// One to three text fields and Save: renaming a bucket, and each row of Edit
// profile (specs/coming-soon R3, R5). The fields start from `fields[].value`
// each time the sheet opens. `canSave(values)` decides whether Save takes a
// tap; `onChange(values)` lets the caller check something as the reader types
// (a username's availability) and show it in `hint`. While `busy` Save shows
// a spinner and nothing takes a tap; `error` stays under the fields until the
// next edit.
export const FieldSheet = ({
  visible, title, message, fields = [], saveLabel = 'Save', canSave = () => true, hint, hintError = false,
  error, busy = false, onChange, onSave, onClose,
}) => {
  const [values, setValues] = useState({});
  // Password fields the reader has chosen to see, by key.
  const [shown, setShown] = useState({});
  const [opened, setOpened] = useState(false);
  // Fresh from the caller's values on every opening, not left over from the last.
  if (visible && !opened) {
    setOpened(true);
    setValues(Object.fromEntries(fields.map((f) => [f.key, f.value || ''])));
    setShown({});
  } else if (!visible && opened) {
    setOpened(false);
  }
  const ready = !busy && canSave(values);
  const update = (key, text) => {
    const next = { ...values, [key]: text };
    setValues(next);
    onChange?.(next);
  };

  return (
    <Sheet visible={visible} onClose={busy ? () => {} : onClose} avoidKeyboard>
      <View style={styles.form}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {fields.map((field, i) => {
          const hidden = !!field.secure && !shown[field.key];
          const input = (
            <TextInput
              key={field.key}
              value={values[field.key] ?? ''}
              onChangeText={(text) => update(field.key, text)}
              placeholder={field.placeholder}
              placeholderTextColor={DS.colors.onSurfaceVariant}
              secureTextEntry={hidden}
              maxLength={field.maxLength}
              autoCapitalize={field.autoCapitalize ?? 'sentences'}
              autoCorrect={false}
              keyboardType={field.keyboardType}
              textContentType={field.textContentType}
              autoFocus={i === 0}
              selectTextOnFocus={i === 0 && !field.secure}
              editable={!busy}
              style={field.secure ? styles.secureInput : [styles.field, styles.lineField]}
              accessibilityLabel={field.label || field.placeholder}
            />
          );
          if (!field.secure) {
            return input;
          }
          // The eye, as on Sign up's password field.
          return (
            <View key={field.key} style={[styles.field, styles.lineField, styles.secureField]}>
              {input}
              <Pressable
                onPress={() => setShown((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`${hidden ? 'Show' : 'Hide'} ${(field.label || field.placeholder).toLowerCase()}`}
              >
                <Icon name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={DS.colors.onSurfaceVariant} />
              </Pressable>
            </View>
          );
        })}
        {hint ? (
          <Text style={[styles.hint, hintError && styles.hintError]} accessibilityLiveRegion="polite">{hint}</Text>
        ) : null}
        {error ? (
          <Text style={styles.sendError} accessibilityLiveRegion="polite">{error}</Text>
        ) : null}
        <PressableScale
          onPress={() => onSave(values)}
          disabled={!ready}
          style={[styles.button, styles.confirmButton]}
          accessibilityRole="button"
          accessibilityLabel={saveLabel}
          accessibilityState={{ disabled: !ready, busy }}
        >
          {busy ? (
            <ActivityIndicator color={DS.colors.onSurface} />
          ) : (
            <Text style={[styles.buttonText, !ready && styles.buttonTextDisabled]}>{saveLabel}</Text>
          )}
        </PressableScale>
        <PressableScale
          onPress={onClose}
          disabled={busy}
          style={[styles.button, busy && styles.buttonInactive]}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, styles.cancelText]}>Cancel</Text>
        </PressableScale>
      </View>
    </Sheet>
  );
};

const MAX_REPORT_LENGTH = 2000;
// Loose on purpose: it catches typos like a missing @ or domain, and the
// address is only ever used by a person replying.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The picker scales the image down before handing over base64, so a phone
// screenshot stays a small attachment (R3.4).
const SCREENSHOT_OPTIONS = {
  mediaType: 'photo',
  selectionLimit: 1,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
  includeBase64: true,
};

// "Report a bug" (bug-reporting spec). Sends to Sentry User Feedback itself
// and calls onSent once the SDK has it; the parent closes and toasts. A send
// error is shown in the sheet, since toasts render under the Modal (R4.6).
export const BugReportSheet = ({ visible, onSent, onClose }) => {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [image, setImage] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Start empty every time the sheet opens, never prefilled from the account
  // (R6.2). Done during render, not in an effect, so the old text never
  // flashes up.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setMessage('');
      setEmail('');
      setImage(null);
      setSending(false);
      setSendError(false);
      setConfirmingDiscard(false);
    }
  }

  const trimmedEmail = email.trim();
  const emailInvalid = trimmedEmail !== '' && !EMAIL_PATTERN.test(trimmedEmail);
  const canSend = message.trim() !== '' && !emailInvalid && !sending;

  const handleSend = () => {
    if (!canSend) {
      return;
    }
    setSending(true);
    setSendError(false);
    try {
      sendBugReport({ message: message.trim(), email: trimmedEmail, image });
    } catch (error) {
      log.warn('Bug report failed to send:', error);
      setSending(false);
      setSendError(true);
      return;
    }
    onSent();
  };

  // Cancelling or a failed pick leaves the sheet as it was (R3.3).
  const handleAttach = () => {
    launchImageLibrary(SCREENSHOT_OPTIONS, (response) => {
      if (response.didCancel) {
        return;
      }
      const asset = response.assets?.[0];
      if (response.errorMessage || !asset?.base64) {
        log.warn('Screenshot pick failed:', response.errorMessage);
        return;
      }
      setImage(asset);
    });
  };

  // Cancel, a tap on the backdrop and the back gesture all come here. With
  // something typed they ask first (R2.6); while asking they mean "keep
  // editing", so a stray tap never throws the report away.
  const handleClose = () => {
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
    } else if (message.trim() !== '' || trimmedEmail !== '' || image) {
      setConfirmingDiscard(true);
    } else {
      onClose();
    }
  };

  return (
    <Sheet visible={visible} onClose={handleClose} avoidKeyboard>
      {confirmingDiscard ? (
        <View style={styles.form}>
          <ConfirmBody
            title="Discard this report?"
            message={'What you\u2019ve written won\u2019t be sent.'}
            confirmLabel="Discard"
            cancelLabel="Keep editing"
            destructive
            onConfirm={onClose}
            onCancel={() => setConfirmingDiscard(false)}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.title}>Report a bug</Text>
          <Text style={styles.message}>
            What happened, and what did you expect? Your device, app version and recent screens
            are included for you.
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Describe the bug"
            placeholderTextColor={DS.colors.placeholder}
            multiline
            maxLength={MAX_REPORT_LENGTH}
            textAlignVertical="top"
            style={[styles.field, styles.reportField]}
            accessibilityLabel="Describe the bug"
          />

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email (optional)"
            placeholderTextColor={DS.colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            style={[styles.field, styles.emailField]}
            accessibilityLabel="Email, optional"
            accessibilityHint="Only if you'd like a reply about this report"
          />
          <Text style={[styles.hint, emailInvalid && styles.hintError]}>
            {emailInvalid
              ? 'Enter a full email address, or leave this empty.'
              : 'Only if you\u2019d like a reply about this report.'}
          </Text>

          {image ? (
            <View style={styles.screenshotRow}>
              <Image
                source={{ uri: image.uri }}
                style={styles.thumbnail}
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.screenshotLabel}>Screenshot attached</Text>
              <Pressable
                onPress={() => setImage(null)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Remove screenshot"
              >
                <Icon name="close-circle" size={22} color={DS.colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleAttach}
              style={({ pressed }) => [styles.screenshotRow, pressed && styles.optionPressed]}
              accessibilityRole="button"
              accessibilityLabel="Attach a screenshot"
            >
              <Icon name="image-outline" size={20} color={DS.colors.primary} />
              <Text style={styles.attachLabel}>Attach a screenshot</Text>
            </Pressable>
          )}

          {sendError ? (
            <Text style={styles.sendError} accessibilityLiveRegion="polite">
            Couldn{'\u2019'}t send your report. Try again.
            </Text>
          ) : null}

          <PressableScale
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.button, styles.confirmButton]}
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend, busy: sending }}
          >
            <Text style={[styles.buttonText, !canSend && styles.buttonTextDisabled]}>Send</Text>
          </PressableScale>
          <PressableScale onPress={handleClose} style={styles.button} accessibilityRole="button">
            <Text style={[styles.buttonText, styles.cancelText]}>Cancel</Text>
          </PressableScale>
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: DS.colors.surfaceContainerLowest + 'B3', // ~70%
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderTopLeftRadius: DS.radius.lg,
    borderTopRightRadius: DS.radius.lg,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.colors.surfaceContainerHighest,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 8,
  },

  options: {
    marginTop: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  optionPressed: {
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
  },
  optionLabelSelected: {
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
    backgroundColor: DS.colors.outlineVariant,
  },

  button: {
    minHeight: 48,
    borderRadius: DS.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButton: {
    backgroundColor: DS.colors.surfaceContainer,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  destructiveText: {
    color: DS.colors.error,
  },
  cancelText: {
    color: DS.colors.onSurfaceVariant,
  },
  buttonInactive: {
    opacity: 0.4,
  },
  buttonTextDisabled: {
    color: DS.colors.disabled,
  },

  // Bug report: capped so it doesn't stretch across an iPad (R5.3).
  form: {
    width: '100%',
    maxWidth: DS.layout.sheetMax,
    alignSelf: 'center',
  },
  // Sunken fields, no border (DESIGN.md §5 Input Fields).
  field: {
    ...DS.type.body,
    color: DS.colors.onSurface,
    backgroundColor: DS.colors.surfaceContainerLowest,
    borderRadius: DS.radius.md,
    paddingHorizontal: DS.spacing[16],
  },
  // Grows with the text up to a cap, then scrolls inside itself so the
  // buttons stay on screen with larger text.
  reportField: {
    minHeight: 120,
    maxHeight: 200,
    paddingTop: DS.spacing[12],
    paddingBottom: DS.spacing[12],
    marginTop: DS.spacing[16],
  },
  emailField: {
    minHeight: DS.size.minHit + 4,
    marginTop: DS.spacing[12],
  },
  lineField: {
    minHeight: DS.size.minHit + 4,
    marginTop: DS.spacing[12],
  },
  // A password field: the sunken field holds the input and its eye.
  secureField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing[8],
  },
  secureInput: {
    ...DS.type.body,
    flex: 1,
    alignSelf: 'stretch',
    color: DS.colors.onSurface,
  },
  hint: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
    marginTop: DS.spacing[8],
    marginHorizontal: DS.spacing[16],
  },
  hintError: {
    color: DS.colors.error,
  },
  // A tonal panel, like the ReadPanda+ note on Delete account.
  screenshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing[12],
    minHeight: 56,
    marginTop: DS.spacing[16],
    paddingHorizontal: DS.spacing[16],
    paddingVertical: DS.spacing[8],
    borderRadius: DS.radius.md,
    backgroundColor: DS.colors.surfaceContainer,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.coverSmall,
    backgroundColor: DS.colors.surfaceContainerLowest,
  },
  screenshotLabel: {
    ...DS.type.rowTitle,
    flex: 1,
    color: DS.colors.onSurface,
  },
  attachLabel: {
    ...DS.type.rowTitle,
    color: DS.colors.primary,
  },
  sendError: {
    ...DS.type.body,
    color: DS.colors.error,
    textAlign: 'center',
    marginTop: DS.spacing[16],
  },
});
