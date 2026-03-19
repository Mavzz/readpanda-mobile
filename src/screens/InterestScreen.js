import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Pressable,
  Text,
  StatusBar,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { primaryButton as PrimaryButton } from '../components/Button';
import log from '../utils/logger';
import { useScreenTracking } from '../utils/screenTracking';
import { useAuth } from '../contexts/AuthContext';
import { PreferenceService } from '../services/user_PreferencesService';
import { DS } from '../styles/global';

const InterestScreen = () => {
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const username = user.username;
  const Interests = user.preferences;
  log.info(`InterestScreen loaded for user: ${username}`);
  const [interests, setInterests] = useState(Interests);
  const [isUpdated, setIsUpdated] = useState(false);
  let status, response;
  const { previousScreen, currentScreen } = useScreenTracking();

  const toggleSelection = (category, preference_id) => {
    setIsUpdated(true);
    log.info(`Toggling preference for category: ${category} and preference_id: ${preference_id}`);
    setInterests((prev) => ({
      ...prev,
      [category]: prev[category].map((item) =>
        item.preference_id === preference_id
          ? { ...item, preference_value: !item.preference_value }
          : item,
      ),
    }));
  };

  const renderTag = ({ item }, category) => (
    <Pressable
      key={item.preference_id}
      onPress={() => toggleSelection(category, item.preference_id)}
      style={[styles.chip, item.preference_value && styles.chipSelected]}
    >
      <Text style={[styles.chipText, item.preference_value && styles.chipTextSelected]}>
        {item.preference_subgenre}
      </Text>
    </Pressable>
  );

  const renderCategory = ({ item: category }) => (
    <View style={styles.category} key={category}>
      <Text style={styles.categoryTitle}>{category}</Text>
      <View style={styles.chipContainer}>
        <FlatList
          data={interests[category]}
          renderItem={(item) => renderTag(item, category)}
          keyExtractor={(item) => item.preference_id.toString()}
          numColumns={3}
        />
      </View>
    </View>
  );

  const updateUserPreferences = async (username, interests, isUpdated, navigation) => {
    log.info('Updating user preferences');
    try {
      if (isUpdated) {
        ({ status, response } = await PreferenceService.updateUserPreferences(username, interests));
        if (status === 200 || status === 201) {
          log.info('User preferences updated successfully');
        } else {
          log.error('Failed to update user preferences with status:', status);
          throw new Error('Failed to update preferences');
        }
        updateUser({ preferences: interests });
        log.info('First time user experience completed');
        navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] });
      } else {
        log.info('No changes made to preferences, navigating to Home');
        navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] });
      }
    } catch (error) {
      log.error('Error updating preferences:', error);
    } finally {
      log.info('Finished updating preferences');
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <View style={styles.container}>
        <View style={styles.headingRow}>
          <Text style={styles.headingPlain}>What's your</Text>
          <Text style={styles.headingAccent}> flavour?</Text>
        </View>
        <FlatList
          data={Object.keys(interests)}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.flatListContent}
          ListFooterComponent={
            <PrimaryButton
              onPress={() => updateUserPreferences(username, interests, isUpdated, navigation)}
              title="Done!"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  headingPlain: {
    fontSize: 28,
    fontWeight: '700',
    color: DS.colors.onSurface,
    letterSpacing: -0.3,
  },
  headingAccent: {
    fontSize: 28,
    fontWeight: '700',
    color: DS.colors.primary,
    letterSpacing: -0.3,
  },
  flatListContent: {
    paddingBottom: 40,
  },
  category: {
    marginBottom: 28,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: DS.colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: DS.colors.primary,
  },
  chipText: {
    color: DS.colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: DS.colors.onPrimary,
    fontWeight: '700',
  },
});

export default InterestScreen;
