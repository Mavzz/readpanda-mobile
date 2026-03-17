import { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Pressable,
  Text,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Background from '../components/Background';
import { primaryButton as PrimaryButton } from '../components/Button';
import log from '../utils/logger';
import { useScreenTracking } from '../utils/screenTracking';
import { useAuth } from '../contexts/AuthContext';
import { PreferenceService } from '../services/user_PreferencesService';

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
      style={[styles.tag, item.preference_value && styles.tagSelected]}
    >
      <Text
        style={[
          styles.tagText,
          item.preference_value && styles.tagTextSelected,
        ]}
      >
        {item.preference_subgenre}
      </Text>
    </Pressable>
  );

  const renderCategory = ({ item: category }) => (
    <View style={styles.category} key={category}>
      <Text style={styles.categoryTitle}>{category}</Text>
      <View style={styles.tagContainer}>
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
        // Handle first time user experience
        ({ status, response } = await PreferenceService.updateUserPreferences(username, interests, user.token));

        if (status === 200 || status === 201) {
          log.info('User preferences updated successfully');
        } else {
          log.error('Failed to update user preferences with status:', status);
          throw new Error('Failed to update preferences');
        }
        updateUser({ preferences: interests });
        log.info('First time user experience completed');
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeMain' }],
        });
      } else {
        log.info('No changes made to preferences, navigating to Home');
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeMain' }],
        });
      }

    } catch (error) {
      log.error('Error updating preferences:', error);
    } finally {
      log.info('Finished updating preferences');
    }
  };

  return (
    <Background>
      <View style={styles.container}>
        <SafeAreaView>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 10 }}>
            <Text
              style={{
                fontSize: 24,
                //marginBottom: 20,
                textAlign: 'center',
                color: '#0A210F',
              }}
            >
              What's your
            </Text>
            <Text
              style={{
                fontSize: 24,
                //marginBottom: 20,
                color: '#E34A6F',
                fontWeight: '400',
                paddingLeft: 5,
              }}
            >
              flavour?
            </Text>
          </View>
          <FlatList
            data={Object.keys(interests)}
            renderItem={renderCategory}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.flatListContent}
            ListFooterComponent={
              <PrimaryButton onPress={() => updateUserPreferences(username, interests, isUpdated, navigation,
              )} title="Done!" />
            }
          />
        </SafeAreaView>
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
  },
  flatListContent: {
    paddingBottom: 40,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 20,
    textAlign: 'center',
  },
  category: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderColor: '#D0D0D0',
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 10,
  },
  tagSelected: {
    backgroundColor: '#DDE8FF',
    borderColor: '#3366FF',
  },
  tagText: {
    color: '#333',
    fontSize: 14,
  },
  tagTextSelected: {
    color: '#3366FF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3366FF',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InterestScreen;
