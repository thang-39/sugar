import { buildExportFilename } from '@/domain/use-cases/export-filename';

const now = 1_000_000;
// Injected stamp: map the two timestamps used in tests to fixed yyyyMMdd strings.
const formatStamp = (ts: number): string => {
  if (ts === now) return '20260705';
  if (ts === 100) return '20260401';
  if (ts === 200) return '20260630';
  return 'XXXXXXXX';
};

describe('buildExportFilename', () => {
  it('names an unbounded (all) export with the current-date stamp', () => {
    expect(buildExportFilename({}, { now, formatStamp })).toBe('sugar-export-all-20260705.csv');
  });

  it('names a bounded range from start to end', () => {
    expect(buildExportFilename({ from: 100, to: 200 }, { now, formatStamp })).toBe(
      'sugar-export-20260401-20260630.csv',
    );
  });

  it('uses now as the end stamp when the upper bound is open', () => {
    expect(buildExportFilename({ from: 100 }, { now, formatStamp })).toBe(
      'sugar-export-20260401-20260705.csv',
    );
  });
});
