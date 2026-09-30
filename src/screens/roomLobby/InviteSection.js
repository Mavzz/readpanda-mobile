import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Clipboard, Share } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { DS } from '../../styles/global';
import { showToast } from '../../components/Toaster';
import log from '../../utils/logger';
import lobbyStyles from './lobbyStyles';

const InviteSection = ({ roomName, inviteCode }) => {
  const [copied, setCopied] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const copiedTimer = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const displayCode = (inviteCode || '------').toUpperCase();

  const handleCopyCode = () => {
    if (!inviteCode) {
      return;
    }
    Clipboard.setString(inviteCode);
    setCopied(true);
    showToast('Invite code copied', 'success', 2000);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    log.info('Invite code copied:', inviteCode);
  };

  const handleShareInvite = async () => {
    if (!inviteCode) {
      return;
    }
    try {
      await Share.share({
        message: `Join "${roomName}" on ReadPanda — invite code: ${inviteCode}`,
      });
    } catch (error) {
      log.error('Failed to share invite:', error);
    }
  };

  return (
    <>
      <Text style={lobbyStyles.eyebrow}>Then, bring your people</Text>
      <View style={styles.inviteCard}>
        <View style={styles.codeWell}>
          <Text style={styles.codeText}>{displayCode}</Text>
          <Pressable
            onPress={handleCopyCode}
            style={({ pressed }) => [styles.copyControl, pressed && lobbyStyles.pressed]}
            accessibilityLabel="Copy invite code"
            accessibilityRole="button"
          >
            <Icon
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={DS.colors.onSurfaceVariant}
            />
            <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleShareInvite}
            style={({ pressed }) => [styles.actionPill, pressed && lobbyStyles.pressed]}
          >
            <Icon name="share-outline" size={15} color={DS.colors.primary} />
            <Text style={styles.actionPillText}>Share invite</Text>
          </Pressable>
          <Pressable
            onPress={() => setQrVisible(true)}
            style={({ pressed }) => [styles.actionPill, pressed && lobbyStyles.pressed]}
          >
            <Icon name="qr-code-outline" size={15} color={DS.colors.primary} />
            <Text style={styles.actionPillText}>QR code</Text>
          </Pressable>
        </View>

        <Text style={styles.inviteCaption}>Anyone with the code can join this room</Text>
      </View>

      <Modal
        visible={qrVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setQrVisible(false)}
      >
        <Pressable style={styles.qrBackdrop} onPress={() => setQrVisible(false)}>
          <Pressable style={styles.qrCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.qrTitle}>Scan to join</Text>
            <Text style={styles.qrRoom} numberOfLines={1}>{roomName}</Text>
            <View style={styles.qrCanvas}>
              {inviteCode ? (
                <QRCode
                  value={`readpanda://join/${inviteCode}`}
                  size={196}
                  color={DS.colors.surfaceContainerLowest}
                  backgroundColor={DS.colors.onSurface}
                />
              ) : null}
            </View>
            <Text style={styles.qrCode}>{displayCode}</Text>
            <Text style={styles.qrCaption}>
              Point a camera at this, or share the code above.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inviteCard: {
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 20,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  codeWell: {
    backgroundColor: DS.colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 24,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
    letterSpacing: 6,
  },
  copyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyText: {
    fontSize: 12,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    padding: 12,
  },
  actionPillText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
  inviteCaption: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 12,
  },
  qrBackdrop: {
    flex: 1,
    backgroundColor: DS.colors.surfaceContainerLowest + 'D9', // ~85%
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  qrCard: {
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 24,
    alignItems: 'center',
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  qrTitle: {
    fontSize: 18,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  qrRoom: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 18,
  },
  qrCanvas: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: DS.colors.onSurface,
  },
  qrCode: {
    fontSize: 20,
    fontFamily: DS.font.extraBold,
    color: DS.colors.primary,
    letterSpacing: 6,
    marginTop: 18,
  },
  qrCaption: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 220,
  },
});

export default InviteSection;
