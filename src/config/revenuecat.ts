import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The `pro` entitlement id configured in the RevenueCat dashboard (Session 23). */
export const RC_ENTITLEMENT_ID = 'pro';
/** The single IAP product id, matching Play/App Store Connect. */
export const RC_PRODUCT_ID = 'sugar_pro_lifetime';

export interface RevenueCatConfig {
  /** Public SDK key for the current platform (goog_… / appl_…). */
  apiKey: string;
  entitlementId: string;
  productId: string;
}

/**
 * Resolves the RevenueCat config for the current platform, or `undefined` when no
 * key is set (Expo Go / jest / any build without the EAS env) — in which case the
 * factory keeps the dev adapter. Keys come from `EXPO_PUBLIC_*` env (set per EAS
 * profile) with an `app.json` `extra.revenueCat` fallback for local dev builds.
 *
 * The RC *public* SDK key is safe to inline in the JS bundle: it can only
 * read/purchase, never administer. The RC secret key / Play service-account JSON
 * must NEVER go here.
 */
export function getRevenueCatConfig(): RevenueCatConfig | undefined {
  const extra = Constants.expoConfig?.extra?.revenueCat as
    | { androidApiKey?: string; iosApiKey?: string }
    | undefined;
  const androidApiKey = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? extra?.androidApiKey;
  const iosApiKey = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? extra?.iosApiKey;
  const apiKey = Platform.OS === 'ios' ? iosApiKey : androidApiKey;
  if (!apiKey) return undefined;
  return { apiKey, entitlementId: RC_ENTITLEMENT_ID, productId: RC_PRODUCT_ID };
}
