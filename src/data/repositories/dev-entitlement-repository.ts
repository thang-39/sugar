import type { ProProduct, PurchaseResult } from '@/domain/models/entitlement';
import type { EntitlementRepository } from '@/domain/repositories/entitlement-repository';

/**
 * In-memory entitlement adapter for Expo Go / tests / the `__DEV__` escape hatch.
 * The real store (Play/RevenueCat) can't run without a native build, so this
 * lets the whole paywall + gating flow be exercised without a purchase.
 *
 * The flag is module-level so it survives factory re-instantiation (the factory
 * builds a fresh repo per call, like the SQLite repos).
 */
let devIsPro = false;

/** Set the dev entitlement directly (Settings `__DEV__` toggle). */
export function setDevPro(value: boolean): void {
  devIsPro = value;
}

/** Reset to not-pro (test setup). */
export function resetDevPro(): void {
  devIsPro = false;
}

/** Placeholder price shown in Expo Go; the real price always comes from the store. */
const DEV_PRO_PRODUCT: ProProduct = {
  identifier: 'sugar_pro_lifetime',
  priceString: '149.000 ₫',
};

export class DevEntitlementRepository implements EntitlementRepository {
  async isPro(): Promise<boolean> {
    return devIsPro;
  }

  async getProProduct(): Promise<ProProduct | undefined> {
    return DEV_PRO_PRODUCT;
  }

  async purchasePro(): Promise<PurchaseResult> {
    devIsPro = true;
    return { outcome: 'Success', isPro: true };
  }

  async restore(): Promise<boolean> {
    return devIsPro;
  }
}
