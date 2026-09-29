import { Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import useAuthStore from '../../stores/authStore';
import useBucketsStore from '../../stores/bucketsStore';
import useFirstRunRecommendation from '../../hooks/useFirstRunRecommendation';
import { topInterest } from '../../utils/interests';
import HeroCard from './HeroCard';
import homeStyles from './homeStyles';

// 3a (FIRST_RUN_3a_3b.md) — no book and no rooms: recommend a first book from
// the reader's top interest, and offer a room as the other way in.
const FirstRunHero = ({ onBrowse, onCreateRoom }) => {
  const preferences = useAuthStore((s) => s.user?.preferences);
  const curatedBuckets = useBucketsStore((s) => s.curatedBuckets);
  const recommendation = useFirstRunRecommendation(curatedBuckets, preferences);
  const interest = recommendation?.interest || topInterest(preferences);

  return (
    <HeroCard
      coverUrl={recommendation?.coverUrl}
      coverTitle={recommendation?.title || 'Your first book'}
      eyebrow="Start your first book"
      title={recommendation?.title || 'Find your first book'}
      ctaLabel="Browse books"
      onCta={onBrowse}
      footer={(
        <Pressable
          onPress={onCreateRoom}
          style={({ pressed }) => [styles.secondaryPill, pressed && homeStyles.pressed]}
        >
          <Icon name="people-outline" size={16} color={DS.colors.primary} />
          <Text style={styles.secondaryPillText}>Start a room with friends</Text>
        </Pressable>
      )}
    >
      <Text style={homeStyles.heroSubtitle} numberOfLines={1}>
        {interest ? `Because you chose ${interest}` : 'A good place to start'}
      </Text>
      <Text style={homeStyles.heroBody}>
        Your nightstand is empty. This one&apos;s a good place to start — or browse for your
        own pick.
      </Text>
    </HeroCard>
  );
};

const styles = StyleSheet.create({
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHighest,
  },
  secondaryPillText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default FirstRunHero;
