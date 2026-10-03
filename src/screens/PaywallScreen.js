import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { DS } from '../styles/global';
import GradientPill from '../components/GradientPill';
import PressableScale from '../components/PressableScale';
import { showToast } from '../components/Toaster';
import useSubscriptionStore from '../stores/subscriptionStore';
import { FREE_LIMITS } from '../hooks/usePlusGate';
import haptics from '../utils/haptics';
import log from '../utils/logger';

// ReadPanda+ paywall. Opened by usePlusGate with the reason the reader hit a
// limit, so the headline speaks to what they were doing (MONETIZATION doc §
// Paywall triggers). Never opened on its own.
const HEADLINES = {
  rooms: {
    title: 'Host every book club you’re in',
    body: `Free accounts host ${FREE_LIMITS.hostedRooms} room. ReadPanda+ hosts as many as you like.`,
  },
  members: {
    title: 'Bring the whole group',
    body: `Rooms on the free plan fit ${FREE_LIMITS.membersPerRoom}. ReadPanda+ rooms fit 25.`,
  },
  buckets: {
    title: 'Shelve everything your way',
    body: `Free accounts keep ${FREE_LIMITS.customBuckets} buckets. ReadPanda+ keeps unlimited.`,
  },
  export: {
    title: 'Take your highlights anywhere',
    body: 'Export highlights and margin notes to Markdown, Notion or Readwise.',
  },
  settings: {
    title: 'Read together, without limits',
    body: 'Reading stays free. ReadPanda+ is for the readers who run the rooms.',
  },
};

const BENEFITS = [
  { icon: 'people', label: 'Unlimited rooms, up to 25 readers each' },
  { icon: 'calendar', label: 'Reading schedules, polls and pinned notes' },
  { icon: 'download', label: 'Export highlights and margin notes' },
  { icon: 'sparkles', label: 'Your year in reading, plus extra themes' },
];

// Shown before the offering loads, and in a build without a RevenueCat key.
const FALLBACK = {
  annual: { price: '$29.99', perMonth: '$2.50' },
  monthly: { price: '$3.99' },
};

const hasFreeTrial = (pkg) => pkg?.product?.introPrice?.price === 0;

const trialLabel = (pkg) => {
  const intro = pkg?.product?.introPrice;
  if (!hasFreeTrial(pkg)) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
};

const PlanCard = ({ selected, title, price, caption, badge, onPress }) => (
  <PressableScale
    onPress={onPress}
    style={[styles.plan, selected ? styles.planSelected : styles.planIdle]}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <View style={[styles.radio, selected && styles.radioSelected]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
    <View style={styles.planText}>
      <View style={styles.planTitleRow}>
        <Text style={styles.planTitle}>{title}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {caption ? <Text style={styles.planCaption}>{caption}</Text> : null}
    </View>
    <Text style={styles.planPrice}>{price}</Text>
  </PressableScale>
);

const PaywallScreen = ({ navigation, route }) => {
  const reason = route?.params?.reason || 'settings';
  const headline = HEADLINES[reason] || HEADLINES.settings;
  // From the provider, not a SafeAreaView: inside a full-screen modal a
  // SafeAreaView reports no top inset and the × sits under the clock
  // (same as CreateBucketScreen).
  const insets = useSafeAreaInsets();

  const offering = useSubscriptionStore((s) => s.offering);
  const loadingOffering = useSubscriptionStore((s) => s.loadingOffering);
  const purchasing = useSubscriptionStore((s) => s.purchasing);
  const isPlus = useSubscriptionStore((s) => s.isPlus);
  const loadOffering = useSubscriptionStore((s) => s.loadOffering);
  const purchase = useSubscriptionStore((s) => s.purchase);
  const restore = useSubscriptionStore((s) => s.restore);

  // Annual is pre-selected: it's the better deal and keeps readers longest.
  const [plan, setPlan] = useState('annual');

  useEffect(() => {
    log.info('Paywall shown:', reason);
    if (!offering) loadOffering();
  }, [reason, offering, loadOffering]);

  const annual = offering?.annual || null;
  const monthly = offering?.monthly || null;
  const selectedPkg = plan === 'annual' ? annual : monthly;

  const prices = useMemo(() => {
    if (!annual || !monthly) return FALLBACK;
    const perMonth = annual.product.price / 12;
    return {
      annual: {
        price: annual.product.priceString,
        perMonth: annual.product.pricePerMonthString || FALLBACK.annual.perMonth,
        save: Math.round((1 - perMonth / monthly.product.price) * 100),
      },
      monthly: { price: monthly.product.priceString },
    };
  }, [annual, monthly]);

  const trial = trialLabel(selectedPkg);
  const ctaLabel = trial ? `Start ${trial}` : 'Subscribe';

  const handlePurchase = async () => {
    if (!selectedPkg) {
      showToast('Subscriptions aren’t available right now', 'error');
      return;
    }
    const result = await purchase(selectedPkg);
    if (result.ok) {
      haptics.success();
      showToast('Welcome to ReadPanda+', 'success');
      navigation.goBack();
    } else if (result.error) {
      showToast(result.error, 'error');
    }
  };

  const handleRestore = async () => {
    const result = await restore();
    if (result.ok) {
      showToast('ReadPanda+ restored', 'success');
      navigation.goBack();
    } else {
      showToast(result.error || 'No ReadPanda+ subscription found for this account', 'info');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />

      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon name="close" size={19} color={DS.colors.onSurface} />
        </PressableScale>
        <Pressable onPress={handleRestore} disabled={purchasing} hitSlop={10} accessibilityRole="button">
          <Text style={styles.restore}>Restore</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>ReadPanda+</Text>
        <Text style={styles.title}>{headline.title}</Text>
        <Text style={styles.body}>{headline.body}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.icon} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Icon name={b.icon} size={15} color={DS.colors.primary} />
              </View>
              <Text style={styles.benefitLabel}>{b.label}</Text>
            </View>
          ))}
        </View>

        {isPlus ? (
          <View style={styles.already}>
            <Icon name="checkmark-circle" size={18} color={DS.colors.primary} />
            <Text style={styles.alreadyText}>You’re on ReadPanda+. Thanks for supporting us.</Text>
          </View>
        ) : (
          <View style={styles.plans} accessibilityRole="radiogroup">
            <PlanCard
              selected={plan === 'annual'}
              title="Annual"
              price={prices.annual.price}
              caption={`${prices.annual.perMonth}/month, billed yearly`}
              badge={prices.annual.save ? `Save ${prices.annual.save}%` : 'Best value'}
              onPress={() => setPlan('annual')}
            />
            <PlanCard
              selected={plan === 'monthly'}
              title="Monthly"
              price={prices.monthly.price}
              caption="Cancel anytime"
              onPress={() => setPlan('monthly')}
            />
          </View>
        )}
      </ScrollView>

      {isPlus ? null : (
        <View style={styles.footer}>
          <GradientPill onPress={handlePurchase} disabled={purchasing || loadingOffering}>
            {purchasing ? (
              <ActivityIndicator color={DS.colors.onPrimary} />
            ) : (
              <Text style={[styles.cta, (purchasing || loadingOffering) && styles.ctaDisabled]}>
                {ctaLabel}
              </Text>
            )}
          </GradientPill>
          {/* App Store Review Guideline 3.1.2: price, period and renewal terms
              next to the button, plus terms and privacy links. */}
          <Text style={styles.fineprint}>
            {trial ? `Free for the trial, then ${plan === 'annual' ? `${prices.annual.price}/year` : `${prices.monthly.price}/month`}. ` : ''}
            Renews automatically until cancelled in your store account settings, at least 24 hours before the period ends.
          </Text>
          <View style={styles.links}>
            <Pressable onPress={() => showToast('Terms are coming soon', 'info')} hitSlop={8}>
              <Text style={styles.link}>Terms</Text>
            </Pressable>
            <Text style={styles.linkDot}>·</Text>
            <Pressable onPress={() => showToast('Privacy policy is coming soon', 'info')} hitSlop={8}>
              <Text style={styles.link}>Privacy</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.space.topBarGutter,
    paddingTop: 8,
  },
  closeButton: {
    width: DS.size.iconButton,
    height: DS.size.iconButton,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restore: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
  },
  content: {
    paddingHorizontal: DS.space.gutter,
    paddingTop: 24,
    paddingBottom: 24,
  },
  eyebrow: {
    ...DS.type.eyebrow,
    color: DS.colors.primary,
    marginBottom: 10,
  },
  title: {
    ...DS.type.pageTitle,
    color: DS.colors.onSurface,
    marginBottom: 10,
  },
  body: {
    ...DS.type.body,
    color: DS.colors.body,
  },
  benefits: {
    marginTop: 24,
    gap: 14,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitLabel: {
    ...DS.type.body,
    color: DS.colors.onSurface,
    flex: 1,
  },
  plans: {
    marginTop: 28,
    gap: DS.space.listGap,
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: DS.radius.tile,
    borderWidth: 1.5,
  },
  planSelected: {
    backgroundColor: DS.colors.surfaceContainerHigh,
    borderColor: DS.colors.primaryContainer,
  },
  planIdle: {
    backgroundColor: DS.colors.surfaceContainer,
    borderColor: DS.colors.surfaceContainer,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: DS.radius.full,
    borderWidth: 1.5,
    borderColor: DS.colors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: DS.colors.primaryContainer,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: DS.radius.full,
    backgroundColor: DS.colors.primaryContainer,
  },
  planText: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    ...DS.type.rowTitle,
    color: DS.colors.onSurface,
  },
  planCaption: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
    marginTop: 2,
  },
  planPrice: {
    ...DS.type.rowTitle,
    color: DS.colors.onSurface,
  },
  badge: {
    backgroundColor: DS.colors.primaryContainer,
    borderRadius: DS.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: DS.font.bold,
    color: DS.colors.onPrimary,
  },
  already: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: DS.radius.tile,
    backgroundColor: DS.colors.surfaceContainer,
  },
  alreadyText: {
    ...DS.type.body,
    color: DS.colors.onSurface,
    flex: 1,
  },
  footer: {
    paddingHorizontal: DS.space.gutter,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cta: {
    fontSize: 15,
    fontFamily: DS.font.extraBold,
    color: DS.colors.onPrimary,
  },
  ctaDisabled: {
    color: DS.colors.disabled,
  },
  fineprint: {
    fontSize: 11,
    fontFamily: DS.font.medium,
    lineHeight: 16,
    color: DS.colors.placeholder,
    textAlign: 'center',
    marginTop: 12,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  link: {
    ...DS.type.meta,
    color: DS.colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
  linkDot: {
    ...DS.type.meta,
    color: DS.colors.placeholder,
  },
});

export default PaywallScreen;
