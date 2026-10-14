import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import log from '../utils/logger';
import { useScreenTracking } from '../utils/screenTracking';
import useAuthStore from '../stores/authStore';
import { PreferenceService } from '../services/preferencesService';
import { DS } from '../styles/global';
import useLayout from '../hooks/useLayout';
import ReadableColumn from '../components/ReadableColumn';
import GradientPill from '../components/GradientPill';
import PressableScale from '../components/PressableScale';
import FromYourPicks from './interests/FromYourPicks';
import usePickCovers from './interests/usePickCovers';

const COLUMN_MAX = 520;
const GUTTER = 20;

// The interests picker (14a): the app's only onboarding screen, and Settings →
// Genres I like. One flat list of genre chips, a cover row showing what the
// picks lead to, then Continue / Skip for now — or just Save from Settings.
// On iPad the same column, centered at 520pt.
const InterestScreen = () => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const navigation = useNavigation();
  const route = useRoute();
  const fromSettings = route.params?.from === 'settings';
  const { isLarge } = useLayout();
  const { width } = useWindowDimensions();
  const username = user.username;
  const Interests = user.preferences;
  log.info(`InterestScreen loaded for user: ${username}`);
  const [interests, setInterests] = useState(Interests);
  const [isUpdated, setIsUpdated] = useState(false);
  // Subgenres in the order they were picked, so the cover row leads with the
  // first choice. Seeded with what's already liked.
  const pickOrder = useRef(null);
  // Sign-up opens this screen as soon as the user is signed in, which can be
  // before their preferences fetch returns. Take the options when they land,
  // unless the reader has already started picking.
  useEffect(() => {
    if (!isUpdated && Interests) {
      setInterests(Interests);
    }
  }, [Interests, isUpdated]);
  let status;
  useScreenTracking();

  // 14a has no header; from Settings there's the native one, for Back.
  useLayoutEffect(() => {
    navigation.setOptions(fromSettings
      ? { headerShown: true, title: 'Genres I like' }
      : { headerShown: false });
  }, [navigation, fromSettings]);

  const chips = Object.entries(interests || {}).flatMap(([category, items]) => (
    (items || []).map((item) => ({ ...item, category }))
  ));
  const pickedNow = chips.filter((c) => c.preference_value).map((c) => c.preference_subgenre);
  if (pickOrder.current === null && chips.length > 0) {
    pickOrder.current = pickedNow;
  }
  const picked = [
    ...(pickOrder.current || []).filter((g) => pickedNow.includes(g)),
    ...pickedNow.filter((g) => !(pickOrder.current || []).includes(g)),
  ];
  const covers = usePickCovers(picked, chips.map((c) => c.preference_subgenre));

  const toggleSelection = (category, item) => {
    setIsUpdated(true);
    log.info(`Toggling preference for category: ${category} and preference_id: ${item.preference_id}`);
    const genre = item.preference_subgenre;
    const order = pickOrder.current || [];
    pickOrder.current = item.preference_value
      ? order.filter((g) => g !== genre)
      : [...order.filter((g) => g !== genre), genre];
    setInterests((prev) => ({
      ...prev,
      [category]: prev[category].map((c) =>
        c.preference_id === item.preference_id
          ? { ...c, preference_value: !c.preference_value }
          : c,
      ),
    }));
  };

  const updateUserPreferences = async () => {
    log.info('Updating user preferences');
    try {
      if (isUpdated) {
        ({ status } = await PreferenceService.updateUserPreferences(username, interests));
        if (status === 200 || status === 201) {
          log.info('User preferences updated successfully');
        } else {
          log.error('Failed to update user preferences with status:', status);
          throw new Error('Failed to update preferences');
        }
        updateUser({ preferences: interests, isNewUser: false });
        log.info('First time user experience completed');
      } else {
        log.info('No changes made to preferences, navigating to Home');
        // Skipping the picks still finishes onboarding — without this the
        // persisted isNewUser sends the reader back here on every cold start.
        updateUser({ isNewUser: false });
      }
      navigation.goBack();
    } catch (error) {
      log.error('Error updating preferences:', error);
    } finally {
      log.info('Finished updating preferences');
    }
  };

  // Onboarding's way out without choosing. Continue with nothing picked takes
  // it too, so an empty set is never saved over what the server had.
  const skip = () => {
    log.info('Interests skipped');
    updateUser({ isNewUser: false });
    navigation.goBack();
  };

  const onPrimary = () => {
    if (!fromSettings && pickedNow.length === 0) {
      skip();
      return;
    }
    updateUserPreferences();
  };

  const columnWidth = Math.min(COLUMN_MAX, width - GUTTER * 2);

  return (
    <SafeAreaView style={styles.screen} edges={fromSettings ? ['bottom'] : ['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ScrollView
        contentContainerStyle={[styles.scroll, isLarge && styles.scrollLarge]}
        showsVerticalScrollIndicator={false}
      >
        <ReadableColumn maxWidth={COLUMN_MAX} style={styles.column}>
          <View style={styles.heading}>
            <Text style={[styles.title, isLarge && styles.titleLarge]}>What do you like to read?</Text>
            <Text style={styles.lede}>
              Pick a few. Discover starts here, and you can change it any time in Profile.
            </Text>
          </View>

          <View style={styles.chips}>
            {chips.map((item) => (
              <Pressable
                key={item.preference_id}
                onPress={() => toggleSelection(item.category, item)}
                style={[styles.chip, item.preference_value && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected: !!item.preference_value }}
              >
                {item.preference_value ? (
                  <Icon name="checkmark" size={14} color={DS.colors.onPrimary} />
                ) : null}
                <Text style={[styles.chipText, item.preference_value && styles.chipTextSelected]}>
                  {item.preference_subgenre}
                </Text>
              </Pressable>
            ))}
          </View>

          <FromYourPicks covers={covers} columnWidth={columnWidth} />

          <View style={styles.footer}>
            <GradientPill onPress={onPrimary} style={styles.primary}>
              <Text style={styles.primaryText}>{fromSettings ? 'Save' : 'Continue'}</Text>
            </GradientPill>
            {fromSettings ? null : (
              <PressableScale onPress={skip} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.skip}>Skip for now</Text>
              </PressableScale>
            )}
          </View>
        </ReadableColumn>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: GUTTER,
    paddingTop: 40,
    paddingBottom: 32,
  },
  // 14a centres the column vertically when there's height to spare.
  scrollLarge: {
    justifyContent: 'center',
  },
  column: {
    gap: 28,
  },
  heading: {
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  titleLarge: {
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 39,
  },
  lede: {
    fontSize: 15,
    fontFamily: DS.font.medium,
    color: DS.colors.body,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
  },
  chipSelected: {
    backgroundColor: DS.colors.primaryContainer,
  },
  chipText: {
    fontSize: 14,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurface,
  },
  chipTextSelected: {
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  primary: {
    alignSelf: 'stretch',
    height: 54,
    paddingVertical: 0,
  },
  primaryText: {
    fontSize: 16,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  skip: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.onSurfaceVariant,
  },
});

export default InterestScreen;
