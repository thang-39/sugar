// src/domain/use-cases/__tests__/compute-chart-stats.test.ts
import { computeChartStats } from '@/domain/use-cases/compute-chart-stats';
import type { ChartPoint } from '@/domain/models/chart';
import { MealTiming } from '@/domain/models/meal';
import type { TargetRanges } from '@/domain/models/target-range';

const ranges: TargetRanges = {
  fasting: { low: 70, high: 100 },
  postMeal: { low: 70, high: 140 },
};

const point = (value: number, extra: Partial<ChartPoint> = {}): ChartPoint => ({
  value,
  timestamp: 0,
  count: 1,
  ...extra,
});

describe('computeChartStats', () => {
  it('returns zeros for no points', () => {
    expect(computeChartStats([], ranges)).toEqual({
      averageMgdl: 0,
      inRangePercent: 0,
      readingCount: 0,
    });
  });

  it('averages values rounded to the nearest integer (mg/dL)', () => {
    const stats = computeChartStats([point(90), point(101)], ranges); // mean 95.5 → 96
    expect(stats.averageMgdl).toBe(96);
  });

  it('evaluates individual points by their meal timing for in-range %', () => {
    // 110 is HIGH for fasting/Before but IN-RANGE for post-meal/After.
    const stats = computeChartStats(
      [
        point(110, { mealTiming: MealTiming.Before }), // high → out
        point(110, { mealTiming: MealTiming.After }), // in range
      ],
      ranges,
    );
    expect(stats.inRangePercent).toBe(50);
  });

  it('uses the union band for aggregated points with no meal timing', () => {
    // No mealTiming → union band [70,140]; 130 is in, 160 is out.
    const stats = computeChartStats([point(130), point(160)], ranges);
    expect(stats.inRangePercent).toBe(50);
  });

  it('sums point counts for the reading total', () => {
    const stats = computeChartStats(
      [point(90, { count: 3 }), point(95, { count: 2 })],
      ranges,
    );
    expect(stats.readingCount).toBe(5);
  });

  it('rounds the percentage', () => {
    // 2 of 3 in range → 66.67 → 67
    const stats = computeChartStats([point(90), point(90), point(200)], ranges);
    expect(stats.inRangePercent).toBe(67);
  });
});
