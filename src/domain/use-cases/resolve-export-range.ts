import { ExportRangePreset } from '../models/export';
import type { ReadingListFilter } from '../repositories/reading-repository';

export interface ResolveExportRangeOptions {
  now: number; // Unix ms
  customFrom?: number; // Unix ms — start of the custom range
  customTo?: number; // Unix ms — end of the custom range
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function monthsAgo(ts: number, months: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() - months);
  return startOfDay(d.getTime());
}

function daysAgo(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() - days);
  return startOfDay(d.getTime());
}

/**
 * Turn an Export screen preset into a `ReadingListFilter`. Bounds use the
 * device's local timezone (PRD "Dates, times, timezone"). "Last N months"
 * ranges have no upper bound so readings up to now are always included.
 */
export function resolveExportRange(
  preset: ExportRangePreset,
  opts: ResolveExportRangeOptions,
): ReadingListFilter {
  switch (preset) {
    case ExportRangePreset.Last7Days:
      return { from: daysAgo(opts.now, 6) };
    case ExportRangePreset.Last14Days:
      return { from: daysAgo(opts.now, 13) };
    case ExportRangePreset.Last30Days:
      return { from: daysAgo(opts.now, 29) };
    case ExportRangePreset.Last3Months:
      return { from: monthsAgo(opts.now, 3) };
    case ExportRangePreset.Last6Months:
      return { from: monthsAgo(opts.now, 6) };
    case ExportRangePreset.Custom: {
      const filter: ReadingListFilter = {};
      if (opts.customFrom !== undefined) filter.from = startOfDay(opts.customFrom);
      if (opts.customTo !== undefined) filter.to = endOfDay(opts.customTo);
      return filter;
    }
    case ExportRangePreset.All:
    default:
      return {};
  }
}
