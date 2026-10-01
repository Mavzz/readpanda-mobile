import { View, Text, StyleSheet, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../../styles/global';
import GradientPill from '../../components/GradientPill';
import lobbyStyles from './lobbyStyles';

// STATE A — nothing chosen yet. A member (pickerName set) sees the card
// alone: only the creator gets the pickers.
const NoBookCard = ({ onChooseBook, onChooseBucket, pickerName }) => (
  <>
    <View style={styles.bookCard}>
      <View style={styles.coverPlaceholder}>
        <Icon name="book-outline" size={24} color={DS.colors.onSurfaceVariant} />
      </View>
      <View style={styles.bookCardText}>
        <Text style={styles.bookCardTitle}>Nothing on the shelf yet</Text>
        <Text style={styles.bookCardBody}>
          {pickerName
            ? `${pickerName} is picking what to read`
            : 'Pick one book — or a bucket, a whole reading list to work through together.'}
        </Text>
      </View>
    </View>
    {!pickerName && (
      <>
        <GradientPill onPress={onChooseBook} style={styles.bookCta}>
          <Icon name="search" size={17} color={DS.colors.onPrimary} />
          <Text style={styles.bookCtaText}>Choose a book</Text>
        </GradientPill>
        <Pressable
          onPress={onChooseBucket}
          style={({ pressed }) => [styles.bucketCta, pressed && lobbyStyles.pressed]}
        >
          <Icon name="albums-outline" size={16} color={DS.colors.primary} />
          <Text style={styles.bucketCtaText}>Read through a bucket</Text>
        </Pressable>
      </>
    )}
  </>
);

const styles = StyleSheet.create({
  bookCard: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: DS.colors.surfaceContainer,
    borderRadius: DS.radius.md,
    padding: 18,
    shadowColor: DS.colors.background,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 6,
  },
  coverPlaceholder: {
    width: 56,
    height: 78,
    borderRadius: 12,
    backgroundColor: DS.colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookCardText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  bookCardTitle: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onSurface,
    marginBottom: 4,
  },
  bookCardBody: {
    fontSize: 12,
    fontFamily: DS.font.medium,
    color: DS.colors.onSurfaceVariant,
    lineHeight: 17,
  },
  bookCta: {
    marginTop: 12,
    gap: 8,
  },
  bookCtaText: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  bucketCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: DS.colors.surfaceContainerHighest,
    borderRadius: DS.radius.full,
    padding: 13,
    marginTop: 10,
  },
  bucketCtaText: {
    fontSize: 13,
    fontFamily: DS.font.bold,
    color: DS.colors.primary,
  },
});

export default NoBookCard;
