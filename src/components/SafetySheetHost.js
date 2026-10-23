import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Platform } from 'react-native';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';
import PickerSheet from './PickerSheet';
import PressableScale from './PressableScale';

// Android has no ActionSheetIOS or Alert.prompt, which useSafetyActions uses
// on iOS for the report reasons and "Something else". This host, mounted
// once at the app root, draws the same two steps there. On iOS it renders
// nothing.

let open = null;

// Resolves with the chosen option's id, or null if dismissed.
export const pickOption = (title, options) =>
  new Promise((resolve) => (open ? open({ kind: 'pick', title, options, resolve }) : resolve(null)));

// Resolves with the text, or null if cancelled. Send waits for some words.
export const askText = (title, message, maxLength) =>
  new Promise((resolve) => (open ? open({ kind: 'text', title, message, maxLength, resolve }) : resolve(null)));

const SafetySheetHost = () => {
  const [request, setRequest] = useState(null);
  const [text, setText] = useState('');
  const { isLarge } = useLayout();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      return undefined;
    }
    open = (next) => {
      setText('');
      setRequest(next);
    };
    return () => {
      open = null;
    };
  }, []);

  if (!request) {
    return null;
  }
  const finish = (value) => {
    request.resolve(value);
    setRequest(null);
  };

  if (request.kind === 'pick') {
    return (
      <PickerSheet
        visible
        title={request.title}
        items={request.options.map((o) => ({ id: o.id, title: o.label, icon: 'flag-outline' }))}
        onSelect={(item) => finish(item.id)}
        onClose={() => finish(null)}
      />
    );
  }

  const ready = text.trim().length > 0;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => finish(null)}>
      <Pressable style={styles.backdrop} onPress={() => finish(null)}>
        <Pressable style={[styles.card, isLarge && styles.cardLarge]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title} accessibilityRole="header">{request.title}</Text>
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <TextInput
            value={text}
            onChangeText={setText}
            maxLength={request.maxLength}
            multiline
            autoFocus
            style={styles.input}
            placeholder="What's wrong?"
            placeholderTextColor={DS.colors.onSurfaceVariant}
            accessibilityLabel={request.title}
          />
          <View style={styles.actions}>
            <PressableScale onPress={() => finish(null)} accessibilityRole="button" style={styles.action}>
              <Text style={styles.cancel}>Cancel</Text>
            </PressableScale>
            <PressableScale
              onPress={() => ready && finish(text.trim())}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready }}
              style={styles.action}
            >
              <Text style={[styles.send, !ready && styles.sendDisabled]}>Send</Text>
            </PressableScale>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: DS.colors.scrim,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.lg,
    padding: 20,
    gap: 12,
  },
  cardLarge: {
    width: '100%',
    maxWidth: DS.layout.sheetMax,
    alignSelf: 'center',
  },
  title: {
    ...DS.type.sheetTitle,
    color: DS.colors.onSurface,
  },
  message: {
    ...DS.type.body,
    color: DS.colors.onSurfaceVariant,
  },
  input: {
    ...DS.type.body,
    minHeight: 96,
    maxHeight: 200,
    color: DS.colors.onSurface,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.comment,
    padding: 12,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  action: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancel: {
    fontSize: 15,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  send: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  sendDisabled: {
    color: DS.colors.onSurfaceVariant,
  },
});

export default SafetySheetHost;
