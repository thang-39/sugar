import type { ReadingListFilter } from '../repositories/reading-repository';

export interface ExportFilenameOptions {
  now: number; // Unix ms — fallback end stamp for open-ended ranges
  formatStamp: (ts: number) => string; // Unix ms → yyyyMMdd (device timezone)
}

/**
 * Build the locked-spec export filename:
 *   `sugar-export-<yyyyMMdd>-<yyyyMMdd>.csv` for a bounded range,
 *   `sugar-export-all-<yyyyMMdd>.csv` when there is no lower bound.
 */
export function buildExportFilename(
  filter: ReadingListFilter,
  opts: ExportFilenameOptions,
): string {
  if (filter.from === undefined) {
    return `sugar-export-all-${opts.formatStamp(opts.now)}.csv`;
  }
  const start = opts.formatStamp(filter.from);
  const end = opts.formatStamp(filter.to ?? opts.now);
  return `sugar-export-${start}-${end}.csv`;
}
