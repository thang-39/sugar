import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { MealType } from '@/domain/models/meal';
import type { Unit } from '@/domain/models/unit';
import type { ReadingListFilter, ReadingRepository } from '@/domain/repositories/reading-repository';
import { buildExportFilename } from '@/domain/use-cases/export-filename';
import { exportReadingsCsv } from '@/domain/use-cases/export-readings-csv';

import { encodeUtf16Le } from './utf16le';

export interface GenerateAndShareCsvDeps {
  readingRepo: ReadingRepository;
  filter: ReadingListFilter;
  unit: Unit;
  mealLabels: Record<MealType, string>;
  now: number; // Unix ms — used for the filename stamp of open-ended ranges
}

export const ShareCsvStatus = {
  Shared: 'shared',
  Empty: 'empty',
  Unavailable: 'unavailable',
} as const;
export type ShareCsvStatus = (typeof ShareCsvStatus)[keyof typeof ShareCsvStatus];

export interface GenerateAndShareCsvResult {
  status: ShareCsvStatus;
  count: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Device-local ISO parts for the CSV Date/Time columns (locale-independent). */
function localIsoParts(ts: number): { date: string; time: string } {
  const d = new Date(ts);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

/** Device-local yyyyMMdd stamp for the filename. */
function localStamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Fetch readings for the filter, generate the spec-locked CSV, write it to the
 * cache directory, and open the native share sheet. The heavy lifting (CSV
 * formatting, filename) is in the pure domain use cases; this only performs the
 * filesystem + sharing side effects.
 */
export async function generateAndShareCsv(
  deps: GenerateAndShareCsvDeps,
): Promise<GenerateAndShareCsvResult> {
  // Repository lists newest-first; the file reads chronologically for a doctor.
  const readings = (await deps.readingRepo.list(deps.filter)).slice().reverse();
  if (readings.length === 0) {
    return { status: ShareCsvStatus.Empty, count: 0 };
  }

  const csv = exportReadingsCsv(readings, {
    unit: deps.unit,
    mealLabels: deps.mealLabels,
    formatRecordedAt: localIsoParts,
  });
  const filename = buildExportFilename(deps.filter, {
    now: deps.now,
    formatStamp: localStamp,
  });

  // Write as UTF-16LE bytes (the leading U+FEFF becomes the FF FE BOM) so Excel
  // detects the encoding and renders Vietnamese correctly. A plain UTF-8 string
  // is misread as a legacy codepage by Excel for macOS.
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(encodeUtf16Le(csv));

  if (!(await Sharing.isAvailableAsync())) {
    return { status: ShareCsvStatus.Unavailable, count: readings.length };
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: filename,
  });
  return { status: ShareCsvStatus.Shared, count: readings.length };
}
