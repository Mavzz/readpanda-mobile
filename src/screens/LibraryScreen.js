import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useEffect } from 'react';
import { DS } from '../styles/global';
import { showToast } from '../components/Toaster';
import useBucketsStore from '../stores/bucketsStore';
import UserBuckets from '../components/UserBuckets';
import CuratedBuckets from '../components/CuratedBuckets';

// Reached from Home's "See all" on Curated for you (design_handoff_redesign
// README: "Buckets/browse moves behind Home's See all") — this is the old
// full-library browsing view (My Buckets + all Curated Picks) that used to
// be the whole Home tab.
const LibraryScreen = ({ navigation }) => {
  const refreshing = useBucketsStore((s) => s.refreshing);
  const loading = useBucketsStore((s) => s.loadingCuratedBuckets);
  const customBuckets = useBucketsStore((s) => s.customBuckets);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);
  const fetchCuratedBuckets = useBucketsStore((s) => s.fetchCuratedBuckets);
  const fetchCustomBuckets = useBucketsStore((s) => s.fetchCustomBuckets);

  const loadBuckets = async (showRefresh = false) => {
    const { status: curatedStatus } = await fetchCuratedBuckets();
    const { status: customStatus } = await fetchCustomBuckets();
    if (showRefresh && curatedStatus === 200 && customStatus === 200) {
      showToast('Buckets refreshed successfully! 📚', 'success');
    } else if (curatedStatus !== 200 && curatedStatus !== null && customStatus !== 200 && customStatus !== null) {
      showToast('Connection error. Please try again.', 'error');
    }
  };

  useEffect(() => {
    loadBuckets();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <SafeAreaView style={styles.safeTop} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={22} color={DS.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Library</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBuckets(true)}
            colors={[DS.colors.primary]}
            tintColor={DS.colors.primary}
          />
        }
      >
        <UserBuckets navigation={navigation} customBuckets={customBuckets} />

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
  safeTop: {
    backgroundColor: DS.colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  headerRight: {
    width: 36,
  },
  loadingBooks: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingBooksText: {
    fontSize: 14,
    fontFamily: DS.font.regular,
    color: DS.colors.onSurfaceVariant,
    marginTop: 12,
  },
});

export default LibraryScreen;
