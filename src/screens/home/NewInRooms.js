import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import useCommentsStore from '../../stores/commentsStore';
import CommentThreadSheet from '../../components/CommentThreadSheet';
import SectionHeader from './SectionHeader';

const Row = ({ item, first, onPress }) => {
  const { root } = item;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowRule, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${root.username}, page ${root.page + 1}, ${item.bookTitle}: ${root.body}`}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{root.initials}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.meta} numberOfLines={1}>
          {root.username} · p. {root.page + 1} · {item.bookTitle}
        </Text>
        <Text style={styles.body} numberOfLines={2}>{root.body}</Text>
      </View>
    </Pressable>
  );
};

// New in your rooms (16b): the newest comments across every room you're in,
// up to your position. Past it the server sends only a count, never text, so
// those show as one locked line rather than blurred rows. A tap opens the
// thread right here — see design.md for why not the reader. `section` is
// from useHomeSections; `split` lays the rows out as two cards (iPad
// portrait, 16d).
const NewInRooms = ({ section, split = false, onSeeAll }) => {
  const toggleLike = useCommentsStore((s) => s.toggleLike);
  const markThreadRead = useCommentsStore((s) => s.markThreadRead);
  const retryComment = useCommentsStore((s) => s.retryComment);
  const addComment = useCommentsStore((s) => s.addComment);
  const byBook = useCommentsStore((s) => s.byBook);
  const [open, setOpen] = useState(null);

  const openThread = open
    ? (byBook[open.bookId]?.threads || []).find((t) => t.anchorKey === open.anchorKey) || null
    : null;
  const { items, locked } = section;

  const rows = items.map((item, i) => (
    <Row
      key={`${item.bookId}:${item.thread.anchorKey}`}
      item={item}
      first={split || i === 0}
      onPress={() => {
        setOpen({ bookId: item.bookId, anchorKey: item.thread.anchorKey, room: item.room });
        markThreadRead(item.bookId, item.thread.anchorKey);
      }}
    />
  ));
  const lockedRow = locked > 0 ? (
    <View style={[styles.locked, items.length > 0 && !split && styles.rowRule]}>
      <Icon name="lock-closed-outline" size={14} color={DS.colors.onSurfaceVariant} />
      <Text style={styles.lockedText}>
        {locked} more past your page · they unlock as you read
      </Text>
    </View>
  ) : null;

  return (
    <View>
      <SectionHeader
        title="New in your rooms"
        link={items.length ? 'See all' : null}
        onLink={() => onSeeAll(items[0].room)}
      />
      {split ? (
        <View style={styles.splitRow}>
          {rows.map((row) => <View key={row.key} style={[styles.card, styles.splitCard]}>{row}</View>)}
          {lockedRow ? <View style={[styles.card, styles.splitCard]}>{lockedRow}</View> : null}
        </View>
      ) : (
        <View style={styles.card}>
          {rows}
          {lockedRow}
        </View>
      )}

      <CommentThreadSheet
        visible={!!openThread}
        thread={openThread}
        roomName={open?.room?.name}
        submitting={false}
        onSubmit={({ body, parentId }) =>
          addComment({
            roomId: open.room.id,
            bookId: open.bookId,
            page: openThread?.page,
            anchorText: openThread?.anchorText,
            anchorBounds: openThread?.anchorBounds,
            parentId,
            body,
            fileHash: openThread?.fileHash,
          }).catch(() => {})
        }
        onLike={(c) => toggleLike(open.bookId, c.id)}
        onRetry={(c) => retryComment(open.bookId, c.clientId)}
        onClose={() => setOpen(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 22,
    backgroundColor: DS.colors.surfaceContainer,
  },
  splitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  splitCard: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  rowRule: {
    borderTopWidth: 1,
    borderTopColor: DS.colors.hairline,
  },
  rowPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: DS.colors.surfaceContainerHighest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  meta: {
    fontSize: 11,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
  body: {
    fontSize: 13,
    fontFamily: DS.font.semibold,
    color: DS.colors.onSurface,
    lineHeight: 18,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  lockedText: {
    flex: 1,
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
});

export default NewInRooms;
