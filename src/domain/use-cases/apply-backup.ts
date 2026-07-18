import type { BackupFile } from '../models/backup';
import { MealTiming, MealType } from '../models/meal';
import { type Reading, SyncStatus } from '../models/reading';
import type { AppSettings } from '../models/settings';
import type { ReadingRepository } from '../repositories/reading-repository';
import type { SettingsRepository } from '../repositories/settings-repository';

export interface ApplyBackupDeps {
  readingRepo: ReadingRepository;
  settingsRepo: SettingsRepository;
}

export interface ApplyBackupResult {
  /** Number of readings written to the DB. */
  restored: number;
  /** Number of structurally-invalid reading rows skipped (never aborts the whole restore). */
  skipped: number;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

const MEAL_TYPES = Object.values(MealType);
const MEAL_TIMINGS = Object.values(MealTiming);
const SYNC_STATUSES = Object.values(SyncStatus);

/**
 * Structural guard for a single backed-up reading. Rejects garbage (wrong types,
 * bad enums, non-integer value) but PRESERVES the app's warn-only semantics: a
 * value outside the 20–600 "normal" band is real user data the app allowed on
 * entry, so it is kept — we intentionally do NOT range-filter here.
 */
function isValidReading(input: unknown): input is Reading {
  if (typeof input !== 'object' || input === null) return false;
  const r = input as Record<string, unknown>;
  if (!isString(r.id) || r.id === '') return false;
  if (r.userId !== undefined && !isString(r.userId)) return false;
  if (typeof r.value !== 'number' || !Number.isInteger(r.value)) return false;
  if (!isOneOf(r.mealType, MEAL_TYPES)) return false;
  if (!isOneOf(r.mealTiming, MEAL_TIMINGS)) return false;
  if (r.hoursAfterMeal !== undefined && typeof r.hoursAfterMeal !== 'number') return false;
  if (r.notes !== undefined && !isString(r.notes)) return false;
  if (typeof r.recordedAt !== 'number' || !Number.isFinite(r.recordedAt)) return false;
  if (typeof r.createdAt !== 'number' || !Number.isFinite(r.createdAt)) return false;
  if (typeof r.updatedAt !== 'number' || !Number.isFinite(r.updatedAt)) return false;
  if (!isOneOf(r.syncStatus, SYNC_STATUSES)) return false;
  return true;
}

/**
 * REPLACE the device's data with a validated backup. Readings that fail the
 * structural guard are skipped and counted (never abort). Good readings keep
 * their original `id`/`createdAt` — restore is not re-entry, so we route through
 * `replaceAll` (atomic clear + bulk insert), NOT `createReading` (regenerates them).
 * Settings rows are cleared then re-persisted key-by-key.
 */
export async function applyBackup(
  file: BackupFile,
  deps: ApplyBackupDeps,
): Promise<ApplyBackupResult> {
  const good: Reading[] = [];
  let skipped = 0;
  for (const candidate of file.readings) {
    if (isValidReading(candidate)) good.push(candidate);
    else skipped += 1;
  }

  await deps.readingRepo.replaceAll(good);

  await deps.settingsRepo.clear();
  const keys = Object.keys(file.settings) as (keyof AppSettings)[];
  for (const key of keys) {
    await deps.settingsRepo.set(key, file.settings[key]);
  }

  return { restored: good.length, skipped };
}
