import type { MealTiming } from './meal';

/**
 * A single plotted point on the trends chart. Values are always mg/dL (canonical
 * storage); the UI converts to the preferred display unit at render time.
 */
export interface ChartPoint {
  value: number; // mg/dL — the reading value, or the rounded daily average
  timestamp: number; // Unix ms — recordedAt for a single reading, local midnight for a daily bucket
  count: number; // number of readings this point represents (1 for individual points)
  mealTiming?: MealTiming; // present only for single-reading points (undefined once aggregated)
}

export interface ChartData {
  points: ChartPoint[]; // sorted oldest→newest (charts read left→right)
  aggregated: boolean; // true when points are daily averages rather than individual readings
}
