import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';

/**
 * Evaluate a reading against target ranges, auto-selecting the range by meal timing.
 * All values are mg/dL; bounds are inclusive.
 */
export function evaluateReading(
  reading: Pick<Reading, 'value' | 'mealTiming'>,
  ranges: TargetRanges,
): RangeEvaluation {
  const range = reading.mealTiming === MealTiming.After ? ranges.postMeal : ranges.fasting;
  if (reading.value < range.low) return RangeEvaluation.Low;
  if (reading.value > range.high) return RangeEvaluation.High;
  return RangeEvaluation.InRange;
}
