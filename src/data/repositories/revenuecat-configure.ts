import Purchases, { LOG_LEVEL } from 'react-native-purchases';

/**
 * Configure the RevenueCat SDK once at boot with the resolved platform key
 * (see `getRevenueCatConfig()`). The app user id stays anonymous — no login —
 * so RevenueCat's stable `$RCAnonymousID` (surfaced via `getAppUserID()`) is the
 * support code. Idempotent enough for a single boot call; do not call per render.
 */
export function configureRevenueCat(apiKey: string): void {
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
}
