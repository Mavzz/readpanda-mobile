import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import profileStyles from './profileStyles';

const Sheet = ({ visible, onClose, children }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.grabber} />
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

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

// Sign out / Delete account. The confirm button carries the action's own
// colour; neither is the gradient CTA.
export const ConfirmSheet = ({ visible, title, message, confirmLabel, destructive, onConfirm, onClose }) => (
  <Sheet visible={visible} onClose={onClose}>
    <Text style={styles.title}>{title}</Text>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <Pressable
      onPress={onConfirm}
      style={({ pressed }) => [styles.button, styles.confirmButton, pressed && profileStyles.pressed]}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, destructive && styles.destructiveText]}>{confirmLabel}</Text>
    </Pressable>
    <Pressable
      onPress={onClose}
      style={({ pressed }) => [styles.button, pressed && profileStyles.pressed]}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, styles.cancelText]}>Cancel</Text>
    </Pressable>
  </Sheet>
);

const styles = StyleSheet.create({
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
});
