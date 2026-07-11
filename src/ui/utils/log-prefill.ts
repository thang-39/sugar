import { type MealTiming, type MealType, MealType as MealTypes, MealTiming as MealTimings } from '@/domain/models/meal';

/** Prefill applied to a fresh Log form (never carries a reading id — always a new entry). */
export interface LogPrefill {
  mealType?: MealType;
  mealTiming?: MealTiming;
  hoursAfterMeal?: number;
}

/** Router params are all strings; parse defensively (unknown values ignored). */
export function parseLogPrefill(params: Record<string, unknown>): LogPrefill {
  const prefill: LogPrefill = {};
  const mt = params.mealType;
  if (typeof mt === 'string' && (Object.values(MealTypes) as string[]).includes(mt)) {
    prefill.mealType = mt as MealType;
  }
  const timing = params.mealTiming;
  if (typeof timing === 'string' && (Object.values(MealTimings) as string[]).includes(timing)) {
    prefill.mealTiming = timing as MealTiming;
  }
  const hours = params.hoursAfterMeal;
  if (typeof hours === 'string' && /^[0-6]$/.test(hours)) {
    prefill.hoursAfterMeal = Number(hours);
  }
  return prefill;
}

/** Serialize a payload → router params for `router.push`. Used by notification taps + Session 12. */
export function toLogParams(prefill: LogPrefill): Record<string, string> {
  const params: Record<string, string> = {};
  if (prefill.mealType) params.mealType = prefill.mealType;
  if (prefill.mealTiming) params.mealTiming = prefill.mealTiming;
  if (prefill.hoursAfterMeal !== undefined) params.hoursAfterMeal = String(prefill.hoursAfterMeal);
  return params;
}
