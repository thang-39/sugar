import { type BackupFile, BACKUP_SCHEMA_VERSION } from '../models/backup';
import { type AppSettings, DEFAULT_SETTINGS } from '../models/settings';
import type { Reading } from '../models/reading';
import { BackupMalformedError, BackupTooNewError } from './backup-errors';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse an unknown value (already JSON-decoded) into a BackupFile.
 *
 * Validates only the ENVELOPE here — that this is our file and we can read its
 * shape. Per-reading structural validation (and skip-counting of garbage rows)
 * happens in `applyBackup`, so an older file with one bad row still restores the
 * rest. Missing settings keys are filled from DEFAULT_SETTINGS so a backup made
 * by an older app version (fewer keys) restores cleanly.
 *
 * @throws BackupMalformedError  not a Sugar backup / unreadable shape
 * @throws BackupTooNewError     schemaVersion newer than this app supports
 */
export function parseBackup(input: unknown): BackupFile {
  if (!isRecord(input)) throw new BackupMalformedError();
  if (input.app !== 'sugar') throw new BackupMalformedError('Not a Sugar backup');

  const { schemaVersion, exportedAt, readings, settings } = input;

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new BackupMalformedError('Invalid schemaVersion');
  }
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupTooNewError(schemaVersion, BACKUP_SCHEMA_VERSION);
  }
  if (typeof exportedAt !== 'number' || !Number.isFinite(exportedAt)) {
    throw new BackupMalformedError('Invalid exportedAt');
  }
  if (!Array.isArray(readings)) throw new BackupMalformedError('readings is not an array');
  if (!isRecord(settings)) throw new BackupMalformedError('settings is not an object');

  // Fill any missing keys from defaults (forward-compat with older backups). The
  // element/settings-value types are validated downstream (applyBackup filters
  // readings); the cast here is the trust boundary of the parse step.
  const mergedSettings: AppSettings = { ...DEFAULT_SETTINGS, ...(settings as Partial<AppSettings>) };

  return {
    app: 'sugar',
    schemaVersion,
    exportedAt,
    readings: readings as Reading[],
    settings: mergedSettings,
  };
}
