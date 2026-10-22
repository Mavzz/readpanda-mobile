import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';
import useRoomStore from '../stores/roomStore';
import { showToast } from './Toaster';
import haptics from '../utils/haptics';
import BookCoverGradient from './BookCoverGradient';
import GradientPill from './GradientPill';
import PressableScale from './PressableScale';
import { memberCountLabel } from './OpenRoomCard';

// The look before joining an open room (R5): what it reads, who started it,
// how many are in it. Comments stay members-only, so there's nothing more to
// show. The caller navigates once joined; a stale room (made invite-only or
// deleted since the list loaded) is said here and handed back to reload.
const OpenRoomSheet = ({ room, visible, onClose, onJoined, onStale }) => {
  const { isLarge } = useLayout();
  const joinOpenRoom = useRoomStore((s) => s.joinOpenRoom);
  const [joining, setJoining] = useState(false);
  // Said inside the sheet: a toast would sit behind this Modal on iOS.
  const [error, setError] = useState(null);
  // A second tap can land before the re-render that disables the first.
  const inFlight = useRef(false);

  useEffect(() => {
    setError(null);
  }, [room?.id]);

  const handleJoin = async () => {
    if (inFlight.current || !room) {
      return;
    }
    inFlight.current = true;
    setJoining(true);
    setError(null);
    const result = await joinOpenRoom(room.id);
    const { status, response, already } = result;
    inFlight.current = false;
    setJoining(false);

    if (status === 200) {
      haptics.success();
      onJoined(response);
    } else if (already) {
      onJoined({ id: room.id, name: room.name });
    } else if (status === 403 || status === 404) {
      // Close first so the toast isn't hidden behind the sheet.
      onStale?.();
      showToast(result.error, 'error');
    } else {
      setError(result.error);
    }
  };

  const meta = room
    ? [memberCountLabel(room.memberCount), room.creatorName && `Started by ${room.creatorName}`]
      .filter(Boolean)
      .join(' · ')
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, isLarge && styles.sheetLarge]} onPress={(e) => e.stopPropagation()}>
          {room ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.topRow}>
                <Text style={styles.eyebrow}>OPEN ROOM</Text>
                <PressableScale
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Icon name="close" size={20} color={DS.colors.onSurfaceVariant} />
                </PressableScale>
              </View>

              <View style={styles.bookRow}>
                <BookCoverGradient
                  coverUrl={room.coverUrl}
                  title={room.currentBookTitle}
                  width={72}
                  height={100}
                  borderRadius={12}
                  titleFontSize={9}
                />
                <View style={styles.bookText}>
                  <Text style={styles.readingLabel}>{room.currentBookTitle ? 'Reading' : 'Book'}</Text>
                  <Text style={styles.bookTitle} numberOfLines={3}>
                    {room.currentBookTitle || 'No book yet'}
                  </Text>
                </View>
              </View>

              <Text style={styles.name} accessibilityRole="header">{room.name}</Text>
              {room.description ? <Text style={styles.description}>{room.description}</Text> : null}
              <Text style={styles.meta}>{meta}</Text>
              {error ? (
                <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              <GradientPill
                onPress={handleJoin}
                style={styles.joinButton}
                accessibilityRole="button"
                accessibilityLabel="Join room"
                accessibilityState={{ busy: joining }}
              >
                {joining ? (
                  <ActivityIndicator color={DS.colors.onPrimary} />
                ) : (
                  <Text style={styles.joinText}>Join room</Text>
                )}
              </GradientPill>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: DS.colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderTopLeftRadius: DS.radius.lg,
    borderTopRightRadius: DS.radius.lg,
    maxHeight: '85%',
  },
  sheetLarge: {
    width: '100%',
    maxWidth: DS.layout.sheetMax,
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
    letterSpacing: 1.4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.comment,
    padding: 14,
    marginBottom: 20,
  },
  bookText: {
    flex: 1,
    minWidth: 0,
  },
  readingLabel: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  bookTitle: {
    fontSize: 15,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  name: {
    fontSize: 22,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 14,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurface,
    lineHeight: 20,
    marginTop: 8,
  },
  meta: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 8,
  },
  error: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.error,
    marginTop: 16,
  },
  joinButton: {
    marginTop: 24,
  },
  joinText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default OpenRoomSheet;
