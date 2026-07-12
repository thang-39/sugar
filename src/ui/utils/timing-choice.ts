import { MealTiming } from '@/domain/models/meal';

/**
 * UI-only representation of meal timing. The domain model still stores
 * `mealTiming` + numeric `hoursAfterMeal`; this collapses the picker to the
 * three options the design exposes.
 */
export const TimingChoice = {
  Before: 'before',
  After1: 'after1',
  After2: 'after2',
} as const;
export type TimingChoice = (typeof TimingChoice)[keyof typeof TimingChoice];

export interface TimingFields {
  mealTiming: MealTiming;
  hoursAfterMeal: number | undefined;
}

/** Map a UI choice to the stored domain fields. */
export function timingChoiceToFields(choice: TimingChoice): TimingFields {
  switch (choice) {
    case TimingChoice.Before:
      return { mealTiming: MealTiming.Before, hoursAfterMeal: undefined };
    case TimingChoice.After1:
      return { mealTiming: MealTiming.After, hoursAfterMeal: 1 };
    case TimingChoice.After2:
      return { mealTiming: MealTiming.After, hoursAfterMeal: 2 };
  }
}

/** Derive the UI choice from stored fields (edit mode / legacy readings). */
export function fieldsToTimingChoice(
  mealTiming: MealTiming,
  hoursAfterMeal: number | undefined,
): TimingChoice {
  if (mealTiming === MealTiming.Before) return TimingChoice.Before;
  // After: any reading recorded at 2h+ maps to the 2h target range, everything
  // else (including legacy 0h / undefined) collapses to 1h.
  return hoursAfterMeal !== undefined && hoursAfterMeal >= 2
    ? TimingChoice.After2
    : TimingChoice.After1;
}
