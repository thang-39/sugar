/**
 * The single paid product and the `pro` entitlement it unlocks (Session 15).
 * Blood-sugar data is never gated; only derived value is (Session 16+).
 */

/** A purchasable product as reported by the store (RevenueCat/Play). */
export interface ProProduct {
  /** Store product id, e.g. `sugar_pro_lifetime`. */
  identifier: string;
  /**
   * Localized price string straight from the store, e.g. `"149.000 ₫"`.
   * ALWAYS displayed as-is — never hardcode or reformat a price.
   */
  priceString: string;
}

/** Result of a purchase or restore attempt. */
export const PurchaseOutcome = {
  Success: 'Success',
  Cancelled: 'Cancelled',
  Pending: 'Pending',
  Error: 'Error',
} as const;
export type PurchaseOutcome = (typeof PurchaseOutcome)[keyof typeof PurchaseOutcome];

export interface PurchaseResult {
  outcome: PurchaseOutcome;
  /** Entitlement state after the attempt (`true` only when `pro` is active). */
  isPro: boolean;
  /** Human-readable error, only when `outcome === 'Error'`. */
  errorMessage?: string;
}
