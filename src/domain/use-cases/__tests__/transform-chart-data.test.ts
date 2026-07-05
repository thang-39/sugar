import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import {
  AGGREGATION_THRESHOLD_DAYS,
  transformChartData,
} from '@/domain/use-cases/transform-chart-data';

// Build a reading at a specific LOCAL wall-clock time so daily-bucket tests are
// independent of the machine's timezone (Date getters/setters are local).
function readingAt(
  year: number,
  month: number, // 1-based for readability
  day: number,
  hour: number,
  value: number,
  timing: MealTiming = MealTiming.Before,
): Reading {
  const recordedAt = new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
  return {
    id: `${recordedAt}-${value}`,
    value,
    mealType: MealType.Breakfast,
    mealTiming: timing,
    recordedAt,
    createdAt: recordedAt,
    updatedAt: recordedAt,
    syncStatus: SyncStatus.Pending,
  };
}

function localMidnight(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

describe('transformChartData', () => {
  it('returns empty points for no readings', () => {
    expect(transformChartData([], 7)).toEqual({ points: [], aggregated: false });
    expect(transformChartData([], 90)).toEqual({ points: [], aggregated: true });
  });

  describe('span < 30 days → individual points', () => {
    it('keeps one point per reading, sorted oldest→newest', () => {
      const readings = [
        readingAt(2026, 7, 3, 8, 120),
        readingAt(2026, 7, 1, 8, 90),
        readingAt(2026, 7, 2, 8, 110),
      ];
      const { points, aggregated } = transformChartData(readings, 7);
      expect(aggregated).toBe(false);
      expect(points.map((p) => p.value)).toEqual([90, 110, 120]);
      expect(points.every((p) => p.count === 1)).toBe(true);
    });

    it('preserves recordedAt timestamp and mealTiming on individual points', () => {
      const readings = [readingAt(2026, 7, 1, 8, 90, MealTiming.After)];
      const { points } = transformChartData(readings, 7);
      expect(points[0]?.timestamp).toBe(readings[0]?.recordedAt);
      expect(points[0]?.mealTiming).toBe(MealTiming.After);
    });

    it('does NOT aggregate multiple same-day readings below the threshold', () => {
      const readings = [readingAt(2026, 7, 1, 8, 90), readingAt(2026, 7, 1, 20, 130)];
      const { points } = transformChartData(readings, 7);
      expect(points).toHaveLength(2);
    });
  });

  describe('span ≥ 30 days → daily averages', () => {
    it('groups readings by local calendar day and averages them', () => {
      const readings = [
        readingAt(2026, 7, 1, 8, 100),
        readingAt(2026, 7, 1, 20, 140), // same day → avg 120
        readingAt(2026, 7, 2, 8, 90),
      ];
      const { points, aggregated } = transformChartData(readings, 90);
      expect(aggregated).toBe(true);
      expect(points).toHaveLength(2);
      expect(points[0]).toMatchObject({
        value: 120,
        count: 2,
        timestamp: localMidnight(2026, 7, 1),
      });
      expect(points[1]).toMatchObject({
        value: 90,
        count: 1,
        timestamp: localMidnight(2026, 7, 2),
      });
    });

    it('rounds the daily average to the nearest integer mg/dL', () => {
      const readings = [
        readingAt(2026, 7, 1, 8, 100),
        readingAt(2026, 7, 1, 12, 100),
        readingAt(2026, 7, 1, 20, 123), // mean 107.67 → 108
      ];
      const { points } = transformChartData(readings, 30);
      expect(points[0]?.value).toBe(108);
    });

    it('leaves mealTiming undefined on aggregated points', () => {
      const readings = [
        readingAt(2026, 7, 1, 8, 100, MealTiming.After),
        readingAt(2026, 7, 1, 20, 140, MealTiming.Before),
      ];
      const { points } = transformChartData(readings, 30);
      expect(points[0]?.mealTiming).toBeUndefined();
    });

    it('sorts daily buckets oldest→newest regardless of input order', () => {
      const readings = [
        readingAt(2026, 7, 5, 8, 100),
        readingAt(2026, 7, 1, 8, 90),
        readingAt(2026, 7, 3, 8, 110),
      ];
      const { points } = transformChartData(readings, 90);
      expect(points.map((p) => p.timestamp)).toEqual([
        localMidnight(2026, 7, 1),
        localMidnight(2026, 7, 3),
        localMidnight(2026, 7, 5),
      ]);
    });
  });

  describe('threshold boundary', () => {
    it(`does not aggregate at exactly ${AGGREGATION_THRESHOLD_DAYS - 1} days`, () => {
      expect(transformChartData([], AGGREGATION_THRESHOLD_DAYS - 1).aggregated).toBe(false);
    });
    it(`aggregates at exactly ${AGGREGATION_THRESHOLD_DAYS} days`, () => {
      expect(transformChartData([], AGGREGATION_THRESHOLD_DAYS).aggregated).toBe(true);
    });
  });
});
