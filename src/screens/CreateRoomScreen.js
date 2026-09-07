import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import { showToast } from '../components/Toaster';
import GradientPill from '../components/GradientPill';
import log from '../utils/logger';
import useRoomStore from '../stores/roomStore';

// Creating a room is one decision (the name) plus one setting (privacy).
// Invite-only is pre-selected — this is a private-friends product. The
// description is deferred to the room's page. See design_handoff § 2b.
const PRIVACY = {
  invite: {
    key: 'invite',
    icon: 'lock-closed',
    label: 'Invite only',
    body: 'Only people with your code can join.',
  },
  open: {
    key: 'open',
    icon: 'globe-outline',
    label: 'Open',
    body: 'Anyone on ReadPanda can find it.',
  },
};

const STEPS = [
  { numeral: '1', label: 'Name' },
  { numeral: '2', label: 'Pick the book' },
  { numeral: '3', label: 'Invite' },
];

const PrivacyCard = ({ option, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.privacyCard,
      selected ? styles.privacyCardSelected : styles.privacyCardIdle,
      pressed && styles.pressed,
    ]}
  >
    <View style={styles.privacyHeader}>
      <Icon
        name={option.icon}
        size={15}
        color={selected ? DS.colors.primary : DS.colors.onSurfaceVariant}
      />
      <Text style={[styles.privacyLabel, selected ? styles.privacyLabelSelected : styles.privacyLabelIdle]}>
        {option.label}
      </Text>
    </View>
    <Text style={styles.privacyBody}>{option.body}</Text>
  </Pressable>
);

const StepsStrip = () => (
  <View style={[styles.steps, styles.stepsStrip]}>
    {STEPS.map((step, index) => (
      <View key={step.numeral} style={styles.steps}>
        {index > 0 && <View style={styles.stepLine} />}
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, index === 0 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumeral, index === 0 && styles.stepNumeralActive]}>
              {step.numeral}
            </Text>
          </View>
          <Text style={styles.stepLabel}>{step.label}</Text>
        </View>
      </View>
    ))}
  </View>
);

const CreateRoomScreen = ({ navigation }) => {
  const saveRoom = useRoomStore((state) => state.saveRoom);
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState(PRIVACY.invite.key);
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0 && !saving;

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);

    const isPrivate = privacy === PRIVACY.invite.key;
    log.info('Creating room:', { name: trimmedName, isPrivate });

    // The API still requires a description — it's collected on the room's
    // page now, so send an empty one.
    const { status, response, error } = await saveRoom({
      name: trimmedName,
      description: '',
      isPrivate,
    });

    if (status === 201 || status === 200) {
      showToast('Room created', 'success');
      navigation.replace('RoomLobbyScreen', { room: response });
      return;
    }

    setSaving(false);
    showToast(error || 'Failed to create room', 'error');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Icon name="close" size={19} color={DS.colors.onSurface} />
            </Pressable>
            <Text style={styles.headerTitle}>New room</Text>
          </View>

          {/* Name */}
          <Text style={styles.eyebrow}>NAME YOUR ROOM</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Midnight Club"
            placeholderTextColor={DS.colors.onSurfaceVariant}
            selectionColor={DS.colors.primary}
            maxLength={50}
            autoFocus
          />
          <Text style={styles.helper}>This is what your friends will see on the invite.</Text>

          {/* Privacy */}
          <Text style={[styles.eyebrow, styles.privacyEyebrow]}>WHO CAN JOIN</Text>
          <View style={styles.privacyRow}>
            <PrivacyCard
              option={PRIVACY.invite}
              selected={privacy === PRIVACY.invite.key}
              onPress={() => setPrivacy(PRIVACY.invite.key)}
            />
            <PrivacyCard
              option={PRIVACY.open}
              selected={privacy === PRIVACY.open.key}
              onPress={() => setPrivacy(PRIVACY.open.key)}
            />
          </View>
          <Text style={styles.helper}>Add a description later from the room&apos;s page.</Text>

          <View style={styles.spacer} />

          <StepsStrip />

          <GradientPill onPress={handleCreate} disabled={!canCreate} style={styles.cta}>
            <Text style={styles.ctaText}>Create room</Text>
          </GradientPill>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 26,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.5,
  },

  // Section eyebrows
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },

  // Name field
  input: {
    backgroundColor: DS.colors.surfaceContainerLowest,
    borderRadius: DS.radius.md,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
  },
  helper: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 8,
    marginHorizontal: 6,
  },

  // Privacy picker
  privacyEyebrow: {
    marginTop: 24,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyCard: {
    flex: 1,
    borderRadius: DS.radius.comment,
  },
  // The selection ring is the one sanctioned stroke — it's a state, not a
  // divider. Padding drops to 12 so the 2px border doesn't shift content.
  privacyCardSelected: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: DS.colors.primary,
    padding: 12,
  },
  privacyCardIdle: {
    backgroundColor: DS.colors.surfaceContainerLow,
    padding: 14,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  privacyLabel: {
    fontSize: 13,
  },
  privacyLabelSelected: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
  },
  privacyLabelIdle: {
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  privacyBody: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 15,
    marginTop: 6,
  },

  spacer: {
    flex: 1,
  },

  // Steps strip
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepsStrip: {
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepLine: {
    width: 14,
    height: 1,
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: DS.colors.primary,
  },
  stepNumeral: {
    fontSize: 10,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurfaceVariant,
  },
  stepNumeralActive: {
    color: DS.colors.onPrimary,
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurfaceVariant,
  },

  // CTA
  cta: {
    marginBottom: 28,
    paddingVertical: 16,
  },
  ctaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default CreateRoomScreen;
