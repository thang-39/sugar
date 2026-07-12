import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { RangeEvaluation } from '@/domain/models/target-range';
import { mealColor, type ColorScheme } from '@/ui/theme';
import { mealIcon } from '@/ui/utils/meal-display';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ReadingDisplay {
  /** i18n key under `today.slots.*` for the card title. */
  titleKey: string;
  icon: IconName;
  /** Icon-tile background (per-meal accent). */
  iconColor: string;
}

/** Presentational metadata for a logged reading, derived from its saved meal semantics. */
export function readingDisplay(reading: Reading): ReadingDisplay {
  const isBefore = reading.mealTiming === MealTiming.Before;
  const isFasting = isBefore && reading.mealType === MealType.Breakfast;
  return {
    titleKey: isBefore
      ? `today.slots.before.${reading.mealType}`
      : `today.slots.after.${reading.mealType}`,
    icon: isFasting ? 'bed-outline' : mealIcon[reading.mealType],
    iconColor: mealColor[reading.mealType],
  };
}

/** Contrast-safe foreground/text color for a target-range evaluation. */
export function statusColor(evaluation: RangeEvaluation, colors: ColorScheme): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.lowText;
    case RangeEvaluation.High:
      return colors.highText;
    default:
      return colors.inRangeText;
  }
}

/** Soft background tint matching {@link statusColor}. */
export function statusBgColor(evaluation: RangeEvaluation, colors: ColorScheme): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.lowBg;
    case RangeEvaluation.High:
      return colors.highBg;
    default:
      return colors.inRangeBg;
  }
}

/** Badge foreground + background pair for a status pill (contrast-safe). */
export function statusBadge(
  evaluation: RangeEvaluation,
  colors: ColorScheme,
): {
  color: string;
  backgroundColor: string;
} {
  return {
    color: statusColor(evaluation, colors),
    backgroundColor: statusBgColor(evaluation, colors),
  };
}
