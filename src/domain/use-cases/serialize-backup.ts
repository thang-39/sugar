import { type BackupFile, BACKUP_SCHEMA_VERSION } from '../models/backup';
import type { Reading } from '../models/reading';
import type { AppSettings } from '../models/settings';

/**
 * Build the canonical backup envelope from the current domain data. Pure — no
 * filesystem, i18n, or clock access; the caller passes `now` (Unix ms).
 */
export function serializeBackup(
  readings: readonly Reading[],
  settings: AppSettings,
  now: number,
): BackupFile {
  return {
    app: 'sugar',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now,
    readings: readings.slice(),
    settings,
  };
}
