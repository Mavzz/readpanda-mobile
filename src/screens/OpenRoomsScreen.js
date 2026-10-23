import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import SeeAllHeader from '../components/SeeAllHeader';
import OpenRoomCard from '../components/OpenRoomCard';
import OpenRoomSheet from '../components/OpenRoomSheet';
import GradientPill from '../components/GradientPill';
import { showToast } from '../components/Toaster';
import useRoomStore from '../stores/roomStore';
import usePlusGate from '../hooks/usePlusGate';
import useLayout from '../hooks/useLayout';

// Rooms › Open rooms › See all (specs/open-rooms R3): every open room the
// reader isn't in, in the API's order, a page at a time. Two columns on iPad,
// like the Rooms tab.
const PAGE = 20;
const GUTTER = 24;
const GAP = 16;

const OpenRoomsScreen = () => {
  const navigation = useNavigation();
  const gate = usePlusGate();
  const fetchOpenRooms = useRoomStore((s) => s.fetchOpenRooms);
  const { width, isLarge, pagePad } = useLayout();
  const gutter = isLarge ? pagePad : GUTTER;
  const cardWidth = isLarge ? (width - gutter * 2 - GAP) / 2 : undefined;

  const [rooms, setRooms] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previewRoom, setPreviewRoom] = useState(null);
  // onEndReached can fire again before the page it asked for arrives.
  const busy = useRef(false);

  const loadFirst = useCallback(async () => {
    busy.current = true;
    const { status, rooms: found, hasMore: more } = await fetchOpenRooms({ limit: PAGE });
    busy.current = false;
    if (status === 200) {
      setRooms(found);
      setHasMore(more);
      setFailed(false);
    } else {
      setFailed(true);
    }
    setLoaded(true);
    return status;
  }, [fetchOpenRooms]);

  // Every focus: a room joined from here has to leave the list on return.
  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst]),
  );

  const refresh = async () => {
    setRefreshing(true);
    const status = await loadFirst();
    setRefreshing(false);
    if (status !== 200) {
      showToast('Connection error. Please try again.', 'error');
    }
  };

  const loadMore = async () => {
    if (busy.current || !hasMore) {
      return;
    }
    busy.current = true;
    setLoadingMore(true);
    const { status, rooms: found, hasMore: more } = await fetchOpenRooms({ limit: PAGE, offset: rooms.length });
    busy.current = false;
    setLoadingMore(false);
    if (status === 200) {
      // Rooms move in the order as people join, so a room can come round
      // twice across pages.
      setRooms((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...found.filter((r) => !seen.has(r.id))];
      });
      setHasMore(more);
    }
  };

  const handleJoined = (room) => {
    setPreviewRoom(null);
    showToast(`Joined ${room.name}`, 'success');
    navigation.navigate('RoomLobbyScreen', { room });
  };

  const handleStale = () => {
    setPreviewRoom(null);
    loadFirst();
  };

  const startRoom = () => gate('rooms', () => navigation.navigate('CreateRoomScreen'));

  const empty = () => {
    if (!loaded) {
      return <ActivityIndicator style={styles.spinner} color={DS.colors.primary} />;
    }
    if (failed) {
      return (
        <View style={styles.message}>
          <Icon name="cloud-offline-outline" size={30} color={DS.colors.onSurfaceVariant} />
          <Text style={styles.messageText}>Couldn&apos;t load open rooms.</Text>
        </View>
      );
    }
    return (
      <View style={styles.message}>
        <Icon name="globe-outline" size={30} color={DS.colors.onSurfaceVariant} />
        <Text style={styles.messageText}>No open rooms right now</Text>
        <GradientPill onPress={startRoom} style={styles.startButton} accessibilityRole="button">
          <Icon name="add" size={17} color={DS.colors.onPrimary} />
          <Text style={styles.startText}>Start a room</Text>
        </GradientPill>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SeeAllHeader title="Open rooms" subtitle="Anyone can join these." />
      <FlatList
        // numColumns can't change on a mounted list; a new layout remounts it.
        key={isLarge ? 'grid' : 'list'}
        numColumns={isLarge ? 2 : 1}
        columnWrapperStyle={isLarge ? styles.row : undefined}
        data={rooms}
        keyExtractor={(room) => String(room.id)}
        renderItem={({ item }) => (
          <OpenRoomCard
            room={item}
            onPress={setPreviewRoom}
            style={isLarge && [styles.cardLarge, { width: cardWidth }]}
          />
        )}
        ListHeaderComponent={<View style={styles.headerGap} />}
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.spinner} color={DS.colors.primary} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      />

      <OpenRoomSheet
        room={previewRoom}
        visible={!!previewRoom}
        onClose={() => setPreviewRoom(null)}
        onJoined={handleJoined}
        onStale={handleStale}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    paddingBottom: 32,
  },
  headerGap: {
    height: 20,
  },
  row: {
    gap: GAP,
    marginBottom: GAP,
  },
  cardLarge: {
    marginBottom: 0,
  },
  spinner: {
    paddingVertical: 24,
  },
  message: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
  },
  messageText: {
    fontSize: 13,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  startButton: {
    marginTop: 8,
    paddingVertical: 13,
  },
  startText: {
    fontSize: 14,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
});

export default OpenRoomsScreen;
