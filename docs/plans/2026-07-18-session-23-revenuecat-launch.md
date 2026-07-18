# Session 23 — RevenueCat Wiring + Store Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the dev entitlement adapter for a real `react-native-purchases` (RevenueCat) adapter behind the existing `getEntitlementRepository()` seam, then submit the fully-built app to Google Play + Apple App Store.

**Architecture:** The paywall/gating UI, `useIsPro()`, and `useEntitlementStore` never change — they already depend only on the `EntitlementRepository` port. Session 23 adds one adapter (`RevenueCatEntitlementRepository`) plus a pure, jest-testable mapper module, and flips the single line in `factory.ts`. RevenueCat is native (crashes Expo Go + jest), so the adapter is loaded via a **lazy `require`** gated on a runtime config check — Expo Go and jest never load `react-native-purchases`, and all correctness logic that *can* be tested lives in the pure mappers.

**Tech Stack:** Expo (EAS build), `react-native-purchases` (RevenueCat), TypeScript strict, Jest. Optional: `@aptabase/react-native` for the deferred analytics sink.

**Scope note:** This session is admin/manual-heavy (store accounts, submissions) with a small, well-bounded code core. The code core is Tasks 1–6. Tasks 0, 7, 8 are admin/verification checklists that gate and follow the code. Do the admin gate (Task 0) **before** starting code, because the RC public key from Task 0 is required to test the adapter.

---

## File Structure

- **Create** `src/config/revenuecat.ts` — reads the RC API keys + ids from env/`expo-constants`; exposes `getRevenueCatConfig()` returning `undefined` when unconfigured (→ dev adapter stays). One place that knows the entitlement id (`pro`) and product id (`sugar_pro_lifetime`).
- **Create** `src/data/repositories/revenuecat-mappers.ts` — PURE functions mapping RevenueCat shapes → domain types (`isProFromCustomerInfo`, `proProductFromOfferings`, `mapPurchaseError`). No `react-native-purchases` runtime import → fully jest-testable.
- **Create** `src/data/repositories/__tests__/revenuecat-mappers.test.ts` — black-box tests for the mappers.
- **Create** `src/data/repositories/revenuecat-entitlement-repository.ts` — thin adapter implementing `EntitlementRepository` by calling `Purchases.*` and delegating all logic to the mappers. Not unit-tested (native) — verified on device in Task 7.
- **Create** `src/data/repositories/revenuecat-configure.ts` — `configureRevenueCat()`, called once at boot.
- **Modify** `src/data/repositories/factory.ts` — `getEntitlementRepository()` branches on `getRevenueCatConfig()`; add `initEntitlement()` that configures RC when present.
- **Modify** `app/_layout.tsx:121` — call `initEntitlement()` before the first entitlement refresh.
- **Modify** `app.json` — add `extra.revenueCat` placeholder + (optional) `@aptabase/react-native` note; bump `version` / `versionCode` for the production build.
- **Modify** `eas.json` — add `EXPO_PUBLIC_*` env to the `production` build profile.
- **Modify** `docs/plans/2026-07-12-session-14-launch-guide.md` — append the RevenueCat console setup + iOS/Apple submission steps (do not duplicate the Android steps already there).
- **Optional / Modify** `src/data/analytics.ts` — swap the `send` no-op for the Aptabase SDK when the app key exists.

---

## Task 0: Admin prerequisites (gate — no code, but blocks Tasks 4–8)

These take days-to-weeks and must be moving in parallel. The **RC Android public SDK key** produced here is required before the adapter can be tested (Task 7). Track them in the launch guide.

**Files:**
- Modify: `docs/plans/2026-07-12-session-14-launch-guide.md` (append an "## ADMIN — Session 23" section; see Task 8 for the content)

- [ ] **Step 1: Google Play merchant/payments profile.** Play Console → Setup → Payments profile. Pay with Vietcombank ECard (Visa debit; enable international online payment + keep balance). Verify (days). Account predates 13/11/2023 → no closed-testing gate.
- [ ] **Step 2: Create the in-app product.** Play Console → Monetize → Products → In-app products → id `sugar_pro_lifetime`, price **149.000₫**, non-consumable, Active.
- [ ] **Step 3: RevenueCat project.** Create project → add **Android app** with package `io.minhthang.sugar` → entitlement id **`pro`** → attach product `sugar_pro_lifetime` → offering **`default`** with a package containing that product. Copy the **Android public SDK key** (`goog_…`).
- [ ] **Step 4: Google Cloud service account → RC↔Play link.** Create a GCP service account, grant it Play Console access (Financial + manage orders), download the JSON, upload it into RevenueCat's Play Service Credentials. (This is what lets RC validate purchases.)
- [ ] **Step 5: Play license testers.** Play Console → Setup → License testing → add your test Google account(s) so sandbox purchases are free of charge.
- [ ] **Step 6 (Apple, parallel):** Apple Developer $99/yr on the ECard → Paid Apps agreement + bank/tax filled → App Store Connect: non-consumable `sugar_pro_lifetime` → add **iOS app** to RevenueCat, copy iOS public key (`appl_…`). Defer if the fee is heavy — Android ships first.
- [ ] **Step 7 (optional):** Aptabase account → create app → copy app key (only if analytics is confirmed).

**Gate:** you have `goog_…` (required) and optionally `appl_…` + Aptabase key before Task 7. Tasks 1–6 (code) can be written before the keys arrive.

---

## Task 1: Install `react-native-purchases`

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install with Expo's resolver** (picks the SDK-compatible version)

```bash
npx expo install react-native-purchases
```

- [ ] **Step 2: Confirm it does NOT break jest.** `react-native-purchases` must never be imported by a jest-run module. Verify the test suite is still green (no code imports it yet):

Run: `npm test`
Expected: PASS (same as before — nothing imports the new package yet)

- [ ] **Step 3: Confirm Expo Go still boots.** RevenueCat has no config plugin for basic use (autolinked at prebuild/EAS build time); it must not be reachable at runtime in Expo Go yet.

Run: `npx expo start` → open in Expo Go
Expected: app boots normally (dev adapter still selected — no RC config present)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-native-purchases dependency"
```

---

## Task 2: RevenueCat config module

**Files:**
- Create: `src/config/revenuecat.ts`
- Modify: `app.json` (add `extra.revenueCat` placeholder)
- Modify: `eas.json` (add env to `production` profile)

- [ ] **Step 1: Create the config module**

```ts
// src/config/revenuecat.ts
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The `pro` entitlement id configured in the RevenueCat dashboard (Task 0). */
export const RC_ENTITLEMENT_ID = 'pro';
/** The single IAP product id, matching Play/App Store Connect (Task 0). */
export const RC_PRODUCT_ID = 'sugar_pro_lifetime';

export interface RevenueCatConfig {
  /** Public SDK key for the current platform (goog_… / appl_…). */
  apiKey: string;
  entitlementId: string;
  productId: string;
}

/**
 * Resolves the RC config for the current platform, or `undefined` when no key is
 * set (Expo Go / jest / any build without the EAS env) — in which case the
 * factory keeps the dev adapter. Keys come from `EXPO_PUBLIC_*` env (set per EAS
 * profile) with an `app.json` `extra` fallback for local dev builds.
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
```

- [ ] **Step 2: Add the `app.json` placeholder** (empty strings so it's undefined-equivalent; real keys go through EAS env, never committed)

In `app.json`, extend the existing `expo.extra` object (currently `{ "router": {}, "eas": {...} }`) — add a sibling key:

```json
"extra": {
  "router": {},
  "eas": { "projectId": "f039fdd4-0914-43c3-96a3-ef20ac9d95f3" },
  "revenueCat": {}
}
```

- [ ] **Step 3: Add the EAS production env** so the key is baked into the store build. In `eas.json`, the `build.production` object gains an `env` block:

```json
"production": {
  "autoIncrement": true,
  "android": { "buildType": "app-bundle" },
  "env": {
    "EXPO_PUBLIC_RC_ANDROID_KEY": "goog_REPLACE_WITH_KEY_FROM_TASK_0"
  }
}
```

> Note: `EXPO_PUBLIC_*` vars are inlined into the JS bundle and are readable in the shipped app. The RC *public* SDK key is designed to be public (it can only read/purchase, not administer), so this is correct — do NOT put the RC secret key or the GCP service-account JSON here.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/revenuecat.ts app.json eas.json
git commit -m "feat: RevenueCat config module + EAS env wiring"
```

---

## Task 3: Pure mappers (TDD)

**Files:**
- Create: `src/data/repositories/revenuecat-mappers.ts`
- Test: `src/data/repositories/__tests__/revenuecat-mappers.test.ts`

The mappers take **structural shapes**, not `react-native-purchases` types, so tests never load the native package. The adapter (Task 4) normalizes RC objects into these shapes.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/repositories/__tests__/revenuecat-mappers.test.ts
import {
  isProFromCustomerInfo,
  mapPurchaseError,
  proProductFromOfferings,
} from '../revenuecat-mappers';

describe('isProFromCustomerInfo', () => {
  it('is true when the entitlement is active', () => {
    const info = { entitlements: { active: { pro: {} } } };
    expect(isProFromCustomerInfo(info, 'pro')).toBe(true);
  });

  it('is false when the entitlement is absent', () => {
    const info = { entitlements: { active: {} } };
    expect(isProFromCustomerInfo(info, 'pro')).toBe(false);
  });
});

describe('proProductFromOfferings', () => {
  it('returns the product matching the id from the current offering', () => {
    const offerings = {
      current: {
        availablePackages: [
          { product: { identifier: 'other', priceString: '1 ₫' } },
          { product: { identifier: 'sugar_pro_lifetime', priceString: '149.000 ₫' } },
        ],
      },
    };
    expect(proProductFromOfferings(offerings, 'sugar_pro_lifetime')).toEqual({
      identifier: 'sugar_pro_lifetime',
      priceString: '149.000 ₫',
    });
  });

  it('falls back to the first package when no id matches', () => {
    const offerings = {
      current: { availablePackages: [{ product: { identifier: 'x', priceString: '5 ₫' } }] },
    };
    expect(proProductFromOfferings(offerings, 'sugar_pro_lifetime')).toEqual({
      identifier: 'x',
      priceString: '5 ₫',
    });
  });

  it('returns undefined when there is no current offering', () => {
    expect(proProductFromOfferings({ current: null }, 'sugar_pro_lifetime')).toBeUndefined();
  });
});

describe('mapPurchaseError', () => {
  it('maps user cancellation to Cancelled', () => {
    expect(mapPurchaseError({ userCancelled: true, isPending: false })).toEqual({
      outcome: 'Cancelled',
      isPro: false,
    });
  });

  it('maps a pending payment to Pending', () => {
    expect(mapPurchaseError({ userCancelled: false, isPending: true })).toEqual({
      outcome: 'Pending',
      isPro: false,
    });
  });

  it('maps anything else to Error with the message', () => {
    expect(
      mapPurchaseError({ userCancelled: false, isPending: false, message: 'network' }),
    ).toEqual({ outcome: 'Error', isPro: false, errorMessage: 'network' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- revenuecat-mappers`
Expected: FAIL — "Cannot find module '../revenuecat-mappers'"

- [ ] **Step 3: Write the mappers**

```ts
// src/data/repositories/revenuecat-mappers.ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- revenuecat-mappers`
Expected: PASS (all cases)

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit` → Expected: PASS

```bash
git add src/data/repositories/revenuecat-mappers.ts src/data/repositories/__tests__/revenuecat-mappers.test.ts
git commit -m "feat: pure RevenueCat → domain mappers with tests"
```

---

## Task 4: RevenueCat adapter (thin, native)

**Files:**
- Create: `src/data/repositories/revenuecat-entitlement-repository.ts`

Not unit-tested — it only calls `Purchases.*` and delegates to the tested mappers. Verified on device in Task 7.

- [ ] **Step 1: Write the adapter**

```ts
// src/data/repositories/revenuecat-entitlement-repository.ts
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
 * Real store adapter (Session 23). Purchases.configure() must have run at boot
 * (see revenuecat-configure.ts) before any method here is called. All logic lives
 * in the pure mappers; this class is only the native boundary.
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
```

- [ ] **Step 2: Create the configure helper**

```ts
// src/data/repositories/revenuecat-configure.ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

/** Idempotent per process. Call once at boot with the resolved platform key. */
export function configureRevenueCat(apiKey: string): void {
  if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  // Anonymous app user id by default — no login. RevenueCat generates a stable
  // $RCAnonymousID surfaced via getAppUserID() as the support code.
}
```

- [ ] **Step 3: Type-check** (this is the first module importing `react-native-purchases` — confirm types resolve)

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Confirm jest is still green** (these files must not be imported by any jest-run module yet — the factory swap in Task 5 uses a lazy require)

Run: `npm test`
Expected: PASS (unchanged count)

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/revenuecat-entitlement-repository.ts src/data/repositories/revenuecat-configure.ts
git commit -m "feat: RevenueCat entitlement adapter + configure helper"
```

---

## Task 5: Factory swap + boot configure

**Files:**
- Modify: `src/data/repositories/factory.ts`
- Modify: `app/_layout.tsx:121` (the entitlement boot effect)

This is the money-principle #2 seam: the only place the adapter is chosen. Lazy `require` keeps `react-native-purchases` out of Expo Go / jest when unconfigured.

- [ ] **Step 1: Update `getEntitlementRepository()` + add `initEntitlement()`**

Replace the existing `getEntitlementRepository` in `src/data/repositories/factory.ts` and add `initEntitlement`. Add the import at the top:

```ts
import { getRevenueCatConfig } from '@/config/revenuecat';
```

```ts
/**
 * Entitlement adapter (money-principle #2 — the ONE place the adapter is chosen).
 * When RevenueCat is configured (a public key is present via EAS env), lazily
 * load the native adapter; otherwise keep the dev adapter so Expo Go + jest run
 * without react-native-purchases. The lazy require ensures the native module is
 * never loaded when unconfigured.
 */
export function getEntitlementRepository(): EntitlementRepository {
  const config = getRevenueCatConfig();
  if (config) {
    const { RevenueCatEntitlementRepository } =
      require('./revenuecat-entitlement-repository') as typeof import('./revenuecat-entitlement-repository');
    return new RevenueCatEntitlementRepository(config.entitlementId, config.productId);
  }
  return new DevEntitlementRepository(getSettingsRepository());
}

/**
 * One-time entitlement bootstrap — configures RevenueCat when present. Safe no-op
 * in Expo Go / jest (no config → no native load). Call once at app boot before
 * the first entitlement refresh.
 */
export function initEntitlement(): void {
  const config = getRevenueCatConfig();
  if (!config) return;
  const { configureRevenueCat } =
    require('./revenuecat-configure') as typeof import('./revenuecat-configure');
  configureRevenueCat(config.apiKey);
}
```

- [ ] **Step 2: Call `initEntitlement()` at boot.** In `app/_layout.tsx`, add the import alongside the other `@/data` imports:

```ts
import { initEntitlement } from '@/data/repositories/factory';
```

Then in the entitlement effect (currently lines 121–128), configure before the first refresh:

```ts
  useEffect(() => {
    initEntitlement(); // configure RevenueCat before any entitlement call (no-op if unconfigured)
    const refresh = (): void => void useEntitlementStore.getState().refresh();
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Confirm jest + Expo Go unchanged.** With no `EXPO_PUBLIC_RC_*` set, `getRevenueCatConfig()` returns `undefined`, so neither RC module is required.

Run: `npm test`
Expected: PASS (unchanged)

Run: `npx expo start` → open in Expo Go → Settings → toggle "Bật Pro (dev)"
Expected: app boots; dev Pro toggle still flips gating (dev adapter still active)

- [ ] **Step 5: Commit**

```bash
git add src/data/repositories/factory.ts app/_layout.tsx
git commit -m "feat: wire RevenueCat adapter behind the entitlement factory seam"
```

---

## Task 6 (optional): Aptabase analytics sink

Only if Task 0 Step 7 produced an app key. Skip entirely otherwise — the dev-log no-op is a valid ship state.

**Files:**
- Modify: `src/data/analytics.ts`
- Modify: `package.json`, `app.json` (env key)

- [ ] **Step 1: Install**

```bash
npx expo install @aptabase/react-native
```

- [ ] **Step 2: Initialize once at boot** (add to the same boot effect as `initEntitlement`, guarded by the key):

```ts
// in app/_layout.tsx boot effect, after initEntitlement()
import { init as initAptabase } from '@aptabase/react-native';
// ...
const aptabaseKey = process.env.EXPO_PUBLIC_APTABASE_KEY;
if (aptabaseKey) initAptabase(aptabaseKey);
```

- [ ] **Step 3: Swap the `send` no-op** in `src/data/analytics.ts` — keep the `enabled` opt-out guard and the exact 6 events, only replace the TODO body:

```ts
import { trackEvent } from '@aptabase/react-native';

function send(name: string, props?: EventProps): void {
  if (!enabled) return;
  if (process.env.EXPO_PUBLIC_APTABASE_KEY) {
    void trackEvent(name, props);
  } else if (__DEV__) {
    console.log('[analytics]', name, props ?? {});
  }
}
```

- [ ] **Step 4: Add the EAS env** in `eas.json` `build.production.env`: `"EXPO_PUBLIC_APTABASE_KEY": "A-…"`.

- [ ] **Step 5: Type-check + verify the opt-out still suppresses sends** (Settings → analytics toggle off → no `trackEvent`).

Run: `npx tsc --noEmit && npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/data/analytics.ts app/_layout.tsx eas.json package.json package-lock.json
git commit -m "feat: wire Aptabase analytics sink behind the opt-out guard"
```

---

## Task 7: Device acceptance — deferred Session-15 acceptance on an EAS build

Requires the Android public key in `eas.json` (Task 0/2) and Play license testers (Task 0 Step 5). Run on a **real device** with a license-tester Google account — RevenueCat/IAP does not work in Expo Go.

**Files:** none (verification)

- [ ] **Step 1: Build a dev/internal client with the RC env baked in**

```bash
eas build -p android --profile preview
```
Install the resulting `.apk` on a device signed into a **license-tester** account.

- [ ] **Step 2: Price comes from the store.** Open the paywall.
Expected: price shows the **store** `priceString` (from RC offering), NOT the dev placeholder. Confirm it reads `149.000 ₫` from Play, and there is no hardcoded strikethrough anchor (money-principle: use "Giá ra mắt" copy).

- [ ] **Step 3: Sandbox purchase unlocks `pro`.** Buy Pro with the license-tester account.
Expected: purchase succeeds free-of-charge; every gate (unlimited PDF, no watermark, CSV, "Theo bữa") unlocks immediately via `useIsPro()`.

- [ ] **Step 4: Survives restart + airplane mode.** Kill+reopen the app; enable airplane mode; reopen.
Expected: still Pro (offline cache via `getCustomerInfo()`).

- [ ] **Step 5: Reinstall → Restore.** Uninstall, reinstall, tap "Khôi phục" (restore).
Expected: Pro re-activates for the same account.

- [ ] **Step 6: Mid-flow cancel is clean.** Start a purchase, cancel the native sheet.
Expected: no crash; state stays not-Pro; `outcome === 'Cancelled'` (no error alert).

- [ ] **Step 7: Console price change without release.** Change the product price in Play/RC console; relaunch the app.
Expected: paywall reflects the new `priceString` with no app update.

- [ ] **Step 8: Support code.** Confirm the settings "support code" now shows the RC app user id (`getAppUserID()`), stable across restarts.

If any step fails → debug the adapter/config (not the UI — the UI is unchanged from Session 15). Record results in the launch guide.

---

## Task 8: Store submission (Google Play + Apple) — extend the launch guide

**Files:**
- Modify: `docs/plans/2026-07-12-session-14-launch-guide.md` (append; do not duplicate the existing Android build/listing steps)

- [ ] **Step 1: Append the RevenueCat + iOS sections** to the launch guide covering Task 0's console setup and the Apple prerequisites, so the whole launch is documented in one place.

- [ ] **Step 2: Bump version.** `app.json` → `expo.version` (e.g. `1.0.0`) and confirm `android.versionCode` / `eas.json autoIncrement`. Commit `chore: bump version for store submission`.

- [ ] **Step 3: Google Play production build + submit**

```bash
eas build -p android --profile production
```
Upload the `.aab` → complete Data Safety (per money-principle §4: purchases + local backup opt-in; **no cloud** — health data never leaves the device) → attach privacy policy + no deletion-request URL needed (no accounts) → **Start rollout**. Optional: internal-testing cohort of 10–15 mẹ ~1 week first (growth §7).

- [ ] **Step 4: Apple prerequisites code pass** (only when Apple is in scope this session): enable the **Apple** entry in the Session-17 auth-provider config array (Sign in with Apple, per App Store 4.8), verify **StoreKit sandbox**, and fill **App Privacy** answers. iOS `bundleIdentifier` is already set.

- [ ] **Step 5: Apple production build + submit**

```bash
eas build -p ios --profile production
```
→ TestFlight → App Store Review → submit.

- [ ] **Step 6: Both stores final checks.** Final screenshots per store specs; privacy policy URL live; review-prompt + weekly-summary (Session 20) verified on the production build; RC products approved in both stores.

- [ ] **Step 7: Final commit**

```bash
git add app.json docs/plans/2026-07-12-session-14-launch-guide.md
git commit -m "chore: production store submission"
```

**Accept (from PLAN-2.md):** app live (or in review) on Google Play AND Apple App Store; sandbox→production IAP works on both; Data Safety / App Privacy accurate; soft-launch cohort invited (if used).

---

## Self-Review

**Spec coverage (PLAN-2.md Session 23):**
- RevenueCat wiring (npm i, adapter, `factory.ts` one-line swap, keys via EAS env) → Tasks 1, 2, 4, 5. ✅
- `sugar_pro_lifetime` @ 149.000₫, entitlement `pro`, offering `default`, Android `io.minhthang.sugar`, GCP service account RC↔Play → Task 0. ✅
- Deferred Session-15 acceptance on an EAS build (unlock/restart/airplane/restore/cancel/price-change, license testers) → Task 7. ✅
- iOS prerequisites (Apple Dev, Paid Apps, non-consumable, RC iOS app, Sign in with Apple, StoreKit sandbox, App Privacy) → Task 0 Step 6, Task 8 Steps 4–5. ✅
- Google Play submission (production `.aab`, listing, Data Safety, rollout, optional soft launch) → Task 8 Step 3. ✅
- Apple submission (TestFlight → review) → Task 8 Step 5. ✅
- Aptabase key (analytics sink) → Task 6 (optional). ✅
- Commit `chore: production store submission` → Task 8 Step 7. ✅
- Money-principles: price always `priceString` (Task 7 Step 2), one entitlement seam (Task 5), no cloud in Data Safety (Task 8 Step 3, per v1.5). ✅

**Type consistency:** `getRevenueCatConfig()` returns `{ apiKey, entitlementId, productId }`; adapter constructed as `new RevenueCatEntitlementRepository(config.entitlementId, config.productId)` and `configureRevenueCat(config.apiKey)` — consistent across Tasks 2/4/5. Mapper names (`isProFromCustomerInfo`, `proProductFromOfferings`, `mapPurchaseError`) identical in Tasks 3 and 4. `NormalizedPurchaseError` shape matches adapter's call site.

**Placeholder scan:** no TBD/TODO-as-work; every code step shows full code; admin steps are concrete console actions. RC/Aptabase keys are intentional `REPLACE_WITH_*` markers filled from Task 0 (real secrets, not committed).
