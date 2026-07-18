import type { ProProduct, PurchaseResult } from '@/domain/models/entitlement';
import type { EntitlementRepository } from '@/domain/repositories/entitlement-repository';
import type { SettingsRepository } from '@/domain/repositories/settings-repository';
import { formatSupportCode } from '@/domain/use-cases/format-support-code';

import { generateId } from '../id';

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
  /**
   * `settingsRepo` backs the persisted support code; `makeId` is injectable so
   * tests stay deterministic. Both are optional so the existing entitlement
   * tests can construct the adapter without wiring persistence.
   */
  constructor(
    private readonly settingsRepo?: SettingsRepository,
    private readonly makeId: () => string = generateId,
  ) {}

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

  async getAppUserId(): Promise<string> {
    if (!this.settingsRepo) {
      throw new Error('DevEntitlementRepository.getAppUserId requires a SettingsRepository');
    }
    // Generate once, then reuse the persisted code so it stays stable across launches.
    const existing = await this.settingsRepo.get('supportCode');
    if (existing) return existing;
    const code = formatSupportCode(this.makeId());
    await this.settingsRepo.set('supportCode', code);
    return code;
  }
}
