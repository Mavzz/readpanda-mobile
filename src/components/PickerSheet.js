import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import BookCoverGradient from './BookCoverGradient';

// One sheet for all three Room Detail prompts (ROOM_DETAIL_2a-2.md):
// "Choose a book", "Read through a bucket", and "Which book first?".
// Items: { id, title, subtitle?, coverUrl? } — a cover is drawn when the
// item is a book, an icon tile when it's a bucket.
const PickerSheet = ({ visible, title, subtitle, items = [], onSelect, onClose, emptyText }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Icon name="close" size={20} color={DS.colors.onSurfaceVariant} />
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="book-outline" size={32} color={DS.colors.onSurfaceVariant} />
            <Text style={styles.emptyText}>{emptyText || 'Nothing to show yet.'}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                {item.isBucket ? (
                  <View style={styles.bucketTile}>
                    <Icon name="albums-outline" size={20} color={DS.colors.primary} />
                  </View>
                ) : (
                  <BookCoverGradient
                    coverUrl={item.coverUrl}
                    title={item.title}
                    width={40}
                    height={56}
                    borderRadius={10}
                    titleFontSize={7}
                  />
                )}
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                  ) : null}
                </View>
                <Icon name="chevron-forward" size={18} color={DS.colors.onSurfaceVariant} />
              </Pressable>
            )}
          />
        )}
      </Pressable>
    </Pressable>
  </Modal>
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
    maxHeight: '80%',
    paddingTop: 20,
    paddingBottom: 28,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },

  list: {
    paddingHorizontal: 24,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.comment,
    padding: 12,
  },
  bucketTile: {
    width: 40,
    height: 56,
    borderRadius: 10,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

export default PickerSheet;
