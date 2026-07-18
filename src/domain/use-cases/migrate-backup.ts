import { type BackupFile, BACKUP_SCHEMA_VERSION } from '../models/backup';

/**
 * Forward-migrate a parsed backup to the CURRENT schema version. `parseBackup`
 * has already rejected files newer than this app, so `file.schemaVersion` here
 * is always in `1..BACKUP_SCHEMA_VERSION`.
 *
 * v1 is the identity migration; the switch is the scaffold for future bumps —
 * add a `case` per version that transforms shape N into N+1 and falls through.
 */
export function migrateBackup(file: BackupFile): BackupFile {
  let migrated = file;
  while (migrated.schemaVersion < BACKUP_SCHEMA_VERSION) {
    switch (migrated.schemaVersion) {
      // case 1: migrated = { ...migrated, schemaVersion: 2, /* transform */ }; break;
      default:
        // Unreachable while BACKUP_SCHEMA_VERSION === 1; guards against an
        // un-handled intermediate version once bumps are added.
        return { ...migrated, schemaVersion: BACKUP_SCHEMA_VERSION };
    }
  }
  return migrated;
}
