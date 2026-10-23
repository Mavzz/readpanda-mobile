import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import useLayout from '../../hooks/useLayout';
import PressableScale from '../../components/PressableScale';

// The active Room's header (2c / 14i): the room, who's in it and what it's
// reading. There's no members row below it; "Where everyone is" shows
// everyone. Inviting is the full invite card further down, not an icon here.
const ActiveRoomHeader = ({ room, bookTitle, memberCount, onBack, onMore }) => {
  const { isLarge } = useLayout();
  const subtitle = [
    `${memberCount} ${memberCount === 1 ? 'reader' : 'readers'}`,
    bookTitle,
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <PressableScale
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-back" size={19} color={DS.colors.onSurface} />
        </PressableScale>
        {onMore ? (
          <PressableScale
            onPress={onMore}
            style={styles.moreButton}
            accessibilityLabel="More actions for this room"
            accessibilityRole="button"
          >
            <Icon name="ellipsis-horizontal" size={18} color={DS.colors.onSurface} />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={[styles.roomName, isLarge && styles.roomNameLarge]} numberOfLines={1}>
            {room?.name ?? 'Room'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: 16,
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Report room, for everyone but the creator (report-block R2.2).
  moreButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  roomName: {
    ...DS.type.pageTitle,
    color: DS.colors.onSurface,
  },
  roomNameLarge: {
    ...DS.type.pageTitleLarge,
  },
  subtitle: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
});

export default ActiveRoomHeader;
