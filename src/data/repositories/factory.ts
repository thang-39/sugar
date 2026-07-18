import { getRevenueCatConfig } from '@/config/revenuecat';
import type { EntitlementRepository } from '@/domain/repositories/entitlement-repository';
import type { ReadingRepository } from '@/domain/repositories/reading-repository';
import type { SettingsRepository } from '@/domain/repositories/settings-repository';
import type { ReadingUseCaseDeps } from '@/domain/use-cases/reading-use-case-deps';

import { getDb } from '../db/client';
import { generateId } from '../id';
import { DevEntitlementRepository } from './dev-entitlement-repository';
import { SqliteReadingRepository } from './sqlite-reading-repository';
import { SqliteSettingsRepository } from './sqlite-settings-repository';

/**
 * Composition helpers used by the UI layer. Repositories bind to the live DB
 * handle (`getDb()` is valid after the boot gate in `app/_layout.tsx`), so these
 * must only be called at render/interaction time, never at module load.
 */
export function getReadingRepository(): ReadingRepository {
  return new SqliteReadingRepository(getDb());
}

export function getSettingsRepository(): SettingsRepository {
  return new SqliteSettingsRepository(getDb());
}

/**
 * Entitlement adapter (money-principle #2 — the ONE place the adapter is chosen).
 * When RevenueCat is configured (a public key is present via EAS env), lazily
 * load the native adapter; otherwise keep the dev adapter so Expo Go + jest run
 * without `react-native-purchases`. The lazy `require` guarantees the native
 * module is never loaded when unconfigured. The paywall/gating UI and `useIsPro()`
 * never change — they depend only on the `EntitlementRepository` port.
 */
export function getEntitlementRepository(): EntitlementRepository {
  const config = getRevenueCatConfig();
  if (config) {
    // Lazy require (not import): keeps react-native-purchases — a native module
    // that crashes Expo Go / jest — out of every unconfigured code path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { RevenueCatEntitlementRepository } = require('./revenuecat-entitlement-repository') as typeof import('./revenuecat-entitlement-repository');
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
  // Lazy require: see getEntitlementRepository — native module stays unloaded when unconfigured.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { configureRevenueCat } = require('./revenuecat-configure') as typeof import('./revenuecat-configure');
  configureRevenueCat(config.apiKey);
}

/** Standard dependency bundle for the reading use cases (create/update/delete). */
export function readingUseCaseDeps(): ReadingUseCaseDeps {
  return { repository: getReadingRepository(), generateId, now: Date.now };
}
