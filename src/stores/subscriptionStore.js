import { create } from 'zustand';
import log from '../utils/logger';
import {
  identify,
  forget,
  hasPlus,
  isPurchasesConfigured,
  getCustomerInfo,
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
  onCustomerInfoUpdate,
} from '../services/purchasesService';

let unsubscribe = null;

const useSubscriptionStore = create((set, get) => ({
  isPlus: false,
  // RevenueCat's current offering: { availablePackages, annual, monthly, ... }.
  offering: null,
  loadingOffering: false,
  purchasing: false,

  // Called once the account is known (loadUser / signIn). Renewals, refunds
  // and purchases made on another device arrive through the listener.
  start: async (username) => {
    try {
      const customerInfo = await identify(username);
      set({ isPlus: hasPlus(customerInfo) });
      if (!unsubscribe && isPurchasesConfigured()) {
        unsubscribe = onCustomerInfoUpdate((info) => set({ isPlus: hasPlus(info) }));
      }
    } catch (error) {
      log.error('Could not load ReadPanda+ status:', error);
    }
  },

  stop: async () => {
    unsubscribe?.();
    unsubscribe = null;
    set({ isPlus: false, offering: null });
    await forget();
  },

  refresh: async () => {
    if (!isPurchasesConfigured()) return;
    try {
      set({ isPlus: hasPlus(await getCustomerInfo()) });
    } catch (error) {
      log.error('Could not refresh ReadPanda+ status:', error);
    }
  },

  loadOffering: async () => {
    if (!isPurchasesConfigured() || get().loadingOffering) return;
    set({ loadingOffering: true });
    try {
      set({ offering: await getCurrentOffering() });
    } catch (error) {
      log.error('Could not load the ReadPanda+ offering:', error);
    } finally {
      set({ loadingOffering: false });
    }
  },

  // { ok } on success; { cancelled } when the reader backed out of the store
  // sheet, which is not an error to show; { error } otherwise.
  purchase: async (pkg) => {
    set({ purchasing: true });
    try {
      const { customerInfo } = await purchasePackage(pkg);
      const ok = hasPlus(customerInfo);
      set({ isPlus: ok });
      return { ok };
    } catch (error) {
      if (error?.userCancelled) return { cancelled: true };
      log.error('ReadPanda+ purchase failed:', error);
      return { error: error?.message || 'Purchase failed' };
    } finally {
      set({ purchasing: false });
    }
  },

  restore: async () => {
    set({ purchasing: true });
    try {
      const ok = hasPlus(await restorePurchases());
      set({ isPlus: ok });
      return { ok };
    } catch (error) {
      log.error('ReadPanda+ restore failed:', error);
      return { error: error?.message || 'Restore failed' };
    } finally {
      set({ purchasing: false });
    }
  },
}));

export default useSubscriptionStore;
