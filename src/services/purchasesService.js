import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { REVENUECAT_IOS_KEY, REVENUECAT_ANDROID_KEY } from '@env';
import log from '../utils/logger';

// ReadPanda+ (MONETIZATION doc § Pricing and packaging). One entitlement,
// `plus`, on both store products; the `default` offering carries them as the
// $rc_annual and $rc_monthly packages, so prices move from the RevenueCat
// dashboard without a release.
export const PLUS_ENTITLEMENT = 'plus';

const apiKey = Platform.select({ ios: REVENUECAT_IOS_KEY, android: REVENUECAT_ANDROID_KEY });

let configured = false;

// Safe to call more than once. Without a key (a dev .env that never set one)
// purchases stay off and everyone reads as free, rather than the app crashing.
export const configurePurchases = (appUserID) => {
  if (configured) return true;
  if (!apiKey) {
    log.warn('RevenueCat key missing — ReadPanda+ purchases are disabled');
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
