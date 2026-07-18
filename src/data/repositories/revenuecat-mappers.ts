import type { ProProduct, PurchaseResult } from '@/domain/models/entitlement';

/** Minimal structural shapes so this module never imports react-native-purchases. */
interface CustomerInfoLike {
  entitlements: { active: Record<string, unknown> };
}
interface StoreProductLike {
  identifier: string;
  priceString: string;
}
interface OfferingsLike {
  current?: { availablePackages: { product: StoreProductLike }[] } | null;
}

/** Purchase error already normalized by the adapter (native codes resolved to booleans). */
export interface NormalizedPurchaseError {
  userCancelled: boolean;
  isPending: boolean;
  message?: string;
}

export function isProFromCustomerInfo(info: CustomerInfoLike, entitlementId: string): boolean {
  return Boolean(info.entitlements.active[entitlementId]);
}

export function proProductFromOfferings(
  offerings: OfferingsLike,
  productId: string,
): ProProduct | undefined {
  const packages = offerings.current?.availablePackages;
  if (!packages || packages.length === 0) return undefined;
  const pkg = packages.find((p) => p.product.identifier === productId) ?? packages[0];
  if (!pkg) return undefined;
  return { identifier: pkg.product.identifier, priceString: pkg.product.priceString };
}

export function mapPurchaseError(error: NormalizedPurchaseError): PurchaseResult {
  if (error.userCancelled) return { outcome: 'Cancelled', isPro: false };
  if (error.isPending) return { outcome: 'Pending', isPro: false };
  return { outcome: 'Error', isPro: false, errorMessage: error.message ?? 'Purchase failed' };
}
