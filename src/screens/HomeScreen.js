import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import { useState, useEffect, useRef } from 'react';
import log from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toaster';
import { DS } from '../styles/global';
import useBucketsStore from '../stores/bucketsStore';
import UserBuckets from '../components/UserBuckets';
import CuratedBuckets from '../components/CuratedBuckets';

const Home = ({ navigation }) => {
  const { user } = useAuth();
  const refreshing = useBucketsStore((s) => s.refreshing);
  const loading = useBucketsStore((s) => s.loadingCuratedBuckets);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const fetchCuratedBuckets = useBucketsStore((s) => s.fetchCuratedBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const didInit = useRef(false);

  const username = user?.username || 'Reader';

  const loadBuckets = async (showRefresh = false) => {
    const { status: curatedStatus } = await fetchCuratedBuckets();
    const { status: customStatus } = await fetchCustomBuckets();
    if (showRefresh && curatedStatus === 200 && customStatus === 200) {
      showToast('Buckets refreshed successfully! 📚', 'success');
    } else if (curatedStatus !== 200 && curatedStatus !== null && customStatus !== 200 && customStatus !== null) {
      showToast('Connection error. Please try again.', 'error');
    }
  };

  const onRefresh = () => {
    showToast('Refreshing your library...', 'info');
    loadBuckets(true);
  };

  useEffect(() => {
    if (!user || didInit.current) {
      log.info('No user found or already initialized, skipping book fetch');
      return;
    }

    if (!hasShownWelcome) {
      log.info('Showing welcome back toast');
      setTimeout(() => {
        showToast(`Welcome back, ${username}! 👋`, 'success', 4000);
        setHasShownWelcome(true);
      }, 500);
    }

    if (user.isNewUser) {
      log.info('Navigating new user to InterestScreen');
      navigation.navigate('Interest');
    } else {
      log.info('Existing user, fetching books');
      loadBuckets();
    }
    didInit.current = true;
  }, [user, hasShownWelcome]);

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
        <View style={styles.loadingContainer}>
          <Icon name="book" size={48} color={DS.colors.primary} />
          <Text style={styles.loadingText}>Loading your library...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      >
        {/* ── My Buckets ─────────────────────────────────────── */}
        <UserBuckets navigation={navigation} customBuckets={customBuckets} />

        {/* ── Curated Picks (Vertical) ───────────────────────────── */}
        {curatedBuckets.length > 0 && (
          <CuratedBuckets navigation={navigation} curatedBuckets={curatedBuckets} />
        )}

        {loading && (
          <View style={styles.loadingBooks}>
            <Icon name="hourglass-outline" size={32} color={DS.colors.onSurfaceVariant} />
            <Text style={styles.loadingBooksText}>Loading your buckets...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: DS.colors.onSurfaceVariant,
    marginTop: 16,
  },
  loadingBooks: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingBooksText: {
    fontSize: 14,
    color: DS.colors.onSurfaceVariant,
    marginTop: 12,
  },
});

export default Home;