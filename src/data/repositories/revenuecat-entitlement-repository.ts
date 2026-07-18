import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type { PurchasesError } from 'react-native-purchases';

import type { ProProduct, PurchaseResult } from '@/domain/models/entitlement';
import type { EntitlementRepository } from '@/domain/repositories/entitlement-repository';

import {
  isProFromCustomerInfo,
  mapPurchaseError,
  proProductFromOfferings,
} from './revenuecat-mappers';

/**
 * Real store adapter (Session 23). `Purchases.configure()` must have run at boot
 * (see `revenuecat-configure.ts`) before any method here is called. All decision
 * logic lives in the pure, jest-tested mappers; this class is only the native
 * boundary — it holds no logic worth unit-testing without the native module.
 */
export class RevenueCatEntitlementRepository implements EntitlementRepository {
  constructor(
    private readonly entitlementId: string,
    private readonly productId: string,
  ) {}

  async isPro(): Promise<boolean> {
    const info = await Purchases.getCustomerInfo(); // offline cache counts
    return isProFromCustomerInfo(info, this.entitlementId);
  }

  async getProProduct(): Promise<ProProduct | undefined> {
    const offerings = await Purchases.getOfferings();
    return proProductFromOfferings(offerings, this.productId);
  }

  async purchasePro(): Promise<PurchaseResult> {
    try {
      const offerings = await Purchases.getOfferings();
      const packages = offerings.current?.availablePackages ?? [];
      const pkg =
        packages.find((p) => p.product.identifier === this.productId) ?? packages[0];
      if (!pkg) {
        return { outcome: 'Error', isPro: false, errorMessage: 'No product available' };
      }
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return {
        outcome: 'Success',
        isPro: isProFromCustomerInfo(customerInfo, this.entitlementId),
      };
    } catch (e) {
      const err = e as PurchasesError;
      return mapPurchaseError({
        userCancelled: err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
        isPending: err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR,
        message: err.message,
      });
    }
  }

  async restore(): Promise<boolean> {
    const info = await Purchases.restorePurchases();
    return isProFromCustomerInfo(info, this.entitlementId);
  }

  async getAppUserId(): Promise<string> {
    return Purchases.getAppUserID();
  }
}
