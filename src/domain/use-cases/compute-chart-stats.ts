// src/domain/use-cases/compute-chart-stats.ts
import type { ChartPoint } from '../models/chart';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';
import { evaluateReading } from './evaluate-reading';

/** Summary tiles shown above/below the trends chart. Values stay in mg/dL; the UI converts + formats. */
export interface ChartStats {
  averageMgdl: number; // mean of plotted values, rounded to nearest integer
  inRangePercent: number; // 0–100, share of plotted points inside target
  readingCount: number; // total readings represented (sums daily-average buckets)
}

function isPointInRange(point: ChartPoint, ranges: TargetRanges): boolean {
  if (point.mealTiming !== undefined) {
    return (
      evaluateReading({ value: point.value, mealTiming: point.mealTiming }, ranges) ===
      RangeEvaluation.InRange
    );
  }
  // Aggregated daily average: no timing → union of both bands (matches the design's chart JS).
  const low = Math.min(ranges.fasting.low, ranges.postMeal.low);
  const high = Math.max(ranges.fasting.high, ranges.postMeal.high);
  return point.value >= low && point.value <= high;
}

export function computeChartStats(
  points: readonly ChartPoint[],
  ranges: TargetRanges,
): ChartStats {
  if (points.length === 0) {
    return { averageMgdl: 0, inRangePercent: 0, readingCount: 0 };
  }
  const sum = points.reduce((acc, p) => acc + p.value, 0);
  const inRange = points.filter((p) => isPointInRange(p, ranges)).length;
  const readingCount = points.reduce((acc, p) => acc + p.count, 0);
  return {
    averageMgdl: Math.round(sum / points.length),
    inRangePercent: Math.round((inRange / points.length) * 100),
    readingCount,
  };
}
