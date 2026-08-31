import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { showToast } from '../components/Toaster';
import log from '../utils/logger';
import useRoomStore from '../stores/roomStore';

const CreateRoomScreen = ({ navigation }) => {
  const saveRoom = useRoomStore((state) => state.saveRoom);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Please enter a room name.', 'error');
      return;
    }

    log.info('Creating room:', { name, description, isPrivate });

    const { status, error } = await saveRoom({
      name: name.trim(),
      description: description.trim(),
      isPrivate,
    });
    if (status === 201 || status === 200) {
      showToast(`Room "${name.trim()}" created!`, 'success');
      navigation.goBack();
    }
    else {
      showToast(error || 'Failed to create room', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Icon name="close" size={22} color={DS.colors.onSurfaceVariant} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Room</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
            disabled={!name.trim()}
          >
            <Text style={styles.saveButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        <View style={styles.formContent}>
          {/* Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Room Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Fantasy Book Club"
              placeholderTextColor={DS.colors.onSurfaceVariant}
              maxLength={50}
              autoFocus
            />
          </View>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="What will this room be about?"
              placeholderTextColor={DS.colors.onSurfaceVariant}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>

          {/* Privacy Toggle */}
          <View style={styles.privacySection}>
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyTitle}>Invite-Only Room</Text>
              <Text style={styles.privacyDescription}>
                {isPrivate
                  ? 'Only people you invite can join this room.'
                  : 'Anyone can find and join this room.'}
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: DS.colors.surfaceContainerHigh, true: DS.colors.primary }}
              thumbColor={isPrivate ? DS.colors.onPrimary : DS.colors.onSurfaceVariant}
            />
          </View>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DS.colors.onSurface,
    flex: 1,
  },
  saveButton: {
    backgroundColor: DS.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: DS.radius.full,
  },
  saveButtonDisabled: {
    opacity: 0.3,
  },
  saveButtonText: {
    color: DS.colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },

  // Form
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderRadius: DS.radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: DS.colors.onSurface,
    borderWidth: 1,
    borderColor: DS.colors.outlineVariant,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // Privacy Section
  privacySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DS.colors.surfaceContainerLow,
    padding: 16,
    borderRadius: DS.radius.sm,
    borderWidth: 1,
    borderColor: DS.colors.outlineVariant,
    marginTop: 8,
  },
  privacyInfo: {
    flex: 1,
    paddingRight: 16,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DS.colors.onSurface,
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 18,
  },
});

export default CreateRoomScreen;
