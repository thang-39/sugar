import { create } from 'zustand';

import { getEntitlementRepository } from '@/data/repositories/factory';
import { setDevPro as setDevProFlag } from '@/data/repositories/dev-entitlement-repository';
import type { ProProduct, PurchaseResult } from '@/domain/models/entitlement';

/**
 * Single source of truth for the `pro` entitlement in the UI (money-principle
 * #2). Zustand caches `isPro` so gates read it synchronously; `refresh()` re-pulls
 * from the store adapter on foreground and after every purchase/restore.
 */
interface EntitlementStore {
  isPro: boolean;
  proProduct?: ProProduct;
  isInitialized: boolean;
  /** Re-pull entitlement + product from the adapter (foreground, boot). */
  refresh: () => Promise<void>;
  /** Run the purchase flow; on success `isPro` flips to the result's value. */
  purchase: () => Promise<PurchaseResult>;
  /** Restore prior purchases; resolves to `isPro` afterwards. */
  restore: () => Promise<boolean>;
  /** `__DEV__` escape hatch — force entitlement without a real purchase. */
  setDevPro: (value: boolean) => void;
}

export const useEntitlementStore = create<EntitlementStore>((set) => ({
  isPro: false,
  proProduct: undefined,
  isInitialized: false,
  refresh: async () => {
    const repo = getEntitlementRepository();
    // Entitlement and product are resolved independently, never as one Promise.all:
    // offline, RevenueCat serves `getCustomerInfo()` from its cache while
    // `getOfferings()` can fail on the network. Coupling them would drop a paying
    // user back to locked whenever the price lookup fails. Either side failing
    // keeps its previous value instead of clearing it.
    const [entitlement, product] = await Promise.allSettled([
      repo.isPro(),
      repo.getProProduct(),
    ]);
    set((s) => ({
      isPro: entitlement.status === 'fulfilled' ? entitlement.value : s.isPro,
      proProduct: product.status === 'fulfilled' ? product.value : s.proProduct,
      isInitialized: true,
    }));
  },
  purchase: async () => {
    const result = await getEntitlementRepository().purchasePro();
    if (result.outcome === 'Success') {
      set({ isPro: result.isPro });
    }
    return result;
  },
  restore: async () => {
    const isPro = await getEntitlementRepository().restore();
    set({ isPro });
    return isPro;
  },
  setDevPro: (value) => {
    setDevProFlag(value);
    set({ isPro: value });
  },
}));

/** Convenience selector — every gate reads Pro state through this. */
export function useIsPro(): boolean {
  return useEntitlementStore((s) => s.isPro);
}
