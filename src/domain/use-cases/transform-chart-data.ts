import type { ChartData, ChartPoint } from '../models/chart';
import type { Reading } from '../models/reading';

/**
 * At or above this span (in days) the chart switches from individual points to
 * daily averages, so long ranges stay legible (PRD "Charts": <30d points, ≥30d
 * daily averages).
 */
export const AGGREGATION_THRESHOLD_DAYS = 30;

/** Local (device-timezone) midnight for the given Unix ms. */
function localDayStart(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Turn a list of readings into chart points for the given time-scale span.
 *
 * Below {@link AGGREGATION_THRESHOLD_DAYS} every reading becomes its own point.
 * At or above it, readings are bucketed by local calendar day and each bucket
 * is plotted as the rounded mean of its values (daily bucket boundaries follow
 * the device timezone, per PRD). Points are returned oldest→newest either way.
 *
 * Pure domain logic — unit conversion for display happens in the UI layer.
 */
export function transformChartData(readings: readonly Reading[], spanDays: number): ChartData {
  const aggregated = spanDays >= AGGREGATION_THRESHOLD_DAYS;

  if (!aggregated) {
    const points: ChartPoint[] = readings
      .map((r) => ({
        value: r.value,
        timestamp: r.recordedAt,
        count: 1,
        mealTiming: r.mealTiming,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    return { points, aggregated };
  }

  const buckets = new Map<number, { sum: number; count: number }>();
  for (const r of readings) {
    const key = localDayStart(r.recordedAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.sum += r.value;
      bucket.count += 1;
    } else {
      buckets.set(key, { sum: r.value, count: 1 });
    }
  }

  const points: ChartPoint[] = [...buckets.entries()]
    .map(([timestamp, { sum, count }]) => ({
      value: Math.round(sum / count),
      timestamp,
      count,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return { points, aggregated };
}
