import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppSettings } from '@/domain/models/settings';
import type { ReadingRepository } from '@/domain/repositories/reading-repository';
import { serializeBackup } from '@/domain/use-cases/serialize-backup';

export interface ExportBackupDeps {
  readingRepo: ReadingRepository;
  /** Current settings snapshot (from the settings store). */
  settings: AppSettings;
  now: number; // Unix ms — filename stamp + exportedAt
  /** Localized share-sheet title (i18n lives in the UI layer). */
  dialogTitle: string;
}

export const ExportBackupStatus = {
  Shared: 'shared',
  Unavailable: 'unavailable',
} as const;
export type ExportBackupStatus = (typeof ExportBackupStatus)[keyof typeof ExportBackupStatus];

export interface ExportBackupResult {
  status: ExportBackupStatus;
  /** Readings included in the file (0 is still a valid backup). */
  count: number;
  filename: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Device-local yyyy-MM-dd stamp for the filename. */
function localDateStamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Serialize all readings + settings to the canonical JSON envelope, write it to
 * the cache directory, and open the native share sheet. Pure formatting lives in
 * `serializeBackup`; this only does the filesystem + sharing side effects.
 *
 * Plain UTF-8 (no BOM) — the UTF-16 BOM trick is a CSV/Excel workaround, never
 * needed for JSON.
 */
export async function exportBackup(deps: ExportBackupDeps): Promise<ExportBackupResult> {
  const readings = await deps.readingRepo.list();
  const backup = serializeBackup(readings, deps.settings, deps.now);
  const json = JSON.stringify(backup);
  const filename = `sugar-backup-${localDateStamp(deps.now)}.json`;

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(json);

  if (!(await Sharing.isAvailableAsync())) {
    return { status: ExportBackupStatus.Unavailable, count: readings.length, filename };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: deps.dialogTitle,
  });
  return { status: ExportBackupStatus.Shared, count: readings.length, filename };
}
