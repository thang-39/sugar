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
    const [isPro, proProduct] = await Promise.all([repo.isPro(), repo.getProProduct()]);
    set({ isPro, proProduct, isInitialized: true });
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
