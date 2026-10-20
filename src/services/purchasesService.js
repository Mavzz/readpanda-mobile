import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { PLUS_ENABLED, REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@env';
import log from '../utils/logger';

// ReadPanda+ (MONETIZATION doc § Pricing and packaging). One entitlement,
// `plus`, on both store products; the `default` offering carries them as the
// $rc_annual and $rc_monthly packages, so prices move from the RevenueCat
// dashboard without a release.
export const PLUS_ENTITLEMENT = 'plus';

const apiKey = Platform.select({ ios: REVENUECAT_IOS_KEY, android: REVENUECAT_ANDROID_KEY });

// The ReadPanda+ switch (specs/plus-off-switch). We launch without it, so it
// is on only when .env asks for it and there's a key to sell with: a build
// must never show a paywall it can't buy from. While off there are no free
// limits, no ReadPanda+ in Settings, and RevenueCat is never called.
export const isPlusEnabled = PLUS_ENABLED === 'true' && Boolean(apiKey);

let configured = false;

// Safe to call more than once. While ReadPanda+ is off, or switched on
// without a key, purchases stay off and everyone reads as free, rather than
// the app crashing.
export const configurePurchases = (appUserID) => {
  if (configured) return true;
  if (!isPlusEnabled) {
    if (PLUS_ENABLED === 'true') log.warn('RevenueCat key missing — ReadPanda+ stays off');
    return false;
  }
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey, appUserID: appUserID || null });
  configured = true;
  return true;
};

export const isPurchasesConfigured = () => configured;

export const hasPlus = (customerInfo) => !!customerInfo?.entitlements?.active?.[PLUS_ENTITLEMENT];

// The username is the account key everywhere else on the device
// (enhancedStorage keys per username), so it is the RevenueCat app user id
// too: a subscription follows the account across devices and reinstalls.
export const identify = async (username) => {
  if (!configurePurchases(username) || !username) return null;
  const { customerInfo } = await Purchases.logIn(username);
  return customerInfo;
};

export const forget = async () => {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    // Already anonymous — nothing to forget.
    log.info('RevenueCat logOut skipped:', error?.message);
  }
};

export const getCustomerInfo = () => Purchases.getCustomerInfo();

export const getCurrentOffering = async () => {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export const purchasePackage = (pkg) => Purchases.purchasePackage(pkg);

export const restorePurchases = () => Purchases.restorePurchases();

export const onCustomerInfoUpdate = (listener) => {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
};
