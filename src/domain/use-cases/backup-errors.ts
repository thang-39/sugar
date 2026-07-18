/**
 * Typed errors the restore pipeline throws so the UI can branch on `instanceof`
 * and show the right i18n message (never string-matching a message).
 */

/** The picked file is not a Sugar backup, or is structurally unreadable. */
export class BackupMalformedError extends Error {
  constructor(message = 'Malformed backup file') {
    super(message);
    this.name = 'BackupMalformedError';
  }
}

/** The file's `schemaVersion` is newer than this app understands — user must update. */
export class BackupTooNewError extends Error {
  constructor(
    readonly fileVersion: number,
    readonly appVersion: number,
  ) {
    super(`Backup schemaVersion ${fileVersion} is newer than supported ${appVersion}`);
    this.name = 'BackupTooNewError';
  }
}
