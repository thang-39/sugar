import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRange, type TargetRanges } from '../models/target-range';

type EvalInput = Pick<Reading, 'value' | 'mealTiming'> & Partial<Pick<Reading, 'hoursAfterMeal'>>;

/**
 * Evaluate a reading against target ranges, auto-selecting the range by meal timing.
 * All values mg/dL; bounds inclusive. When a reading is >= 2h after a meal and a 2h
 * range is provided (gestational), that range is used; otherwise the 1h range.
 */
export function evaluateReading(reading: EvalInput, ranges: TargetRanges): RangeEvaluation {
  const range = selectRange(reading, ranges);
  if (reading.value < range.low) return RangeEvaluation.Low;
  if (reading.value > range.high) return RangeEvaluation.High;
  return RangeEvaluation.InRange;
}

function selectRange(reading: EvalInput, ranges: TargetRanges): TargetRange {
  if (reading.mealTiming !== MealTiming.After) return ranges.fasting;
  const hours = reading.hoursAfterMeal;
  if (hours != null && hours >= 2 && ranges.postMeal2h) return ranges.postMeal2h;
  return ranges.postMeal;
}
