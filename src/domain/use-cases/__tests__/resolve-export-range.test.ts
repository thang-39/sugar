import { ExportRangePreset } from '@/domain/models/export';
import { resolveExportRange } from '@/domain/use-cases/resolve-export-range';

// Fixed local wall-clock time so month math is deterministic regardless of the
// machine timezone (both `now` and the expected bounds use local Date ctors).
const now = new Date(2026, 6, 5, 10, 30, 0, 0).getTime(); // 2026-07-05 10:30 local

describe('resolveExportRange', () => {
  it('returns an unbounded range for "all"', () => {
    expect(resolveExportRange(ExportRangePreset.All, { now })).toEqual({});
  });

  it('starts 3 months back at start-of-day, with no upper bound, for "last3m"', () => {
    const { from, to } = resolveExportRange(ExportRangePreset.Last3Months, { now });
    expect(from).toBe(new Date(2026, 3, 5, 0, 0, 0, 0).getTime()); // 2026-04-05 00:00
    expect(to).toBeUndefined();
  });

  it('starts 6 months back at start-of-day for "last6m"', () => {
    const { from, to } = resolveExportRange(ExportRangePreset.Last6Months, { now });
    expect(from).toBe(new Date(2026, 0, 5, 0, 0, 0, 0).getTime()); // 2026-01-05 00:00
    expect(to).toBeUndefined();
  });

  it('spans start-of-day(from) to end-of-day(to) for a custom range', () => {
    const customFrom = new Date(2026, 5, 1, 14, 0, 0, 0).getTime(); // 2026-06-01 14:00
    const customTo = new Date(2026, 5, 30, 9, 0, 0, 0).getTime(); // 2026-06-30 09:00
    const { from, to } = resolveExportRange(ExportRangePreset.Custom, {
      now,
      customFrom,
      customTo,
    });
    expect(from).toBe(new Date(2026, 5, 1, 0, 0, 0, 0).getTime());
    expect(to).toBe(new Date(2026, 5, 30, 23, 59, 59, 999).getTime());
  });

  it('treats a custom range with missing bounds as unbounded on that side', () => {
    expect(resolveExportRange(ExportRangePreset.Custom, { now })).toEqual({});
  });
});
