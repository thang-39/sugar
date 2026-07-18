import type { Reading } from './reading';
import type { AppSettings } from './settings';

/**
 * Backup-format version WE own (independent of the drizzle migration ids). Bump
 * on any shape change to `BackupFile` and add a forward-migration step in
 * `migrate-backup.ts`. Start at 1.
 */
export const BACKUP_SCHEMA_VERSION = 1;

/**
 * Canonical, versioned local backup file. Serializes DOMAIN models (not the
 * SQLite row layout) so DB migrations can never break an older file — the
 * repository maps domain ↔ row on restore.
 */
export interface BackupFile {
  app: 'sugar';
  /** See BACKUP_SCHEMA_VERSION. */
  schemaVersion: number;
  /** Unix ms the file was produced. */
  exportedAt: number;
  readings: Reading[];
  settings: AppSettings;
}
