import type { ProProduct, PurchaseResult } from '../models/entitlement';

/**
 * Port for the `pro` entitlement (Session 15). The RevenueCat adapter lives in
 * `src/data/`; a dev adapter backs it in Expo Go / tests. Use cases and the
 * `useIsPro()` store depend only on this interface — the one source of truth for
 * entitlement (money-principle #2).
 */
export interface EntitlementRepository {
  /** `true` when the `pro` entitlement is active (offline cache counts). */
  isPro(): Promise<boolean>;
  /** The single Pro product, or `undefined` if the store hasn't loaded it. */
  getProProduct(): Promise<ProProduct | undefined>;
  /** Start the native purchase flow. Never throws — failures map to `outcome`. */
  purchasePro(): Promise<PurchaseResult>;
  /** Restore prior purchases. Resolves to `isPro` after restoring. */
  restore(): Promise<boolean>;
  /**
   * Stable per-install store identifier, **raw** — dev returns a locally persisted
   * id, the RevenueCat adapter returns `Purchases.getAppUserID()` verbatim so it
   * can be pasted into the RC dashboard to look the customer up (Session 20's
   * promotional-Pro flow). Presentation is not this layer's job: run it through
   * `formatSupportCode()` for the short code shown to the user.
   */
  getAppUserId(): Promise<string>;
}
