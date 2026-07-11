import type { TargetRange } from './target-range';

export const ConditionType = {
  Gestational: 'gestational',
  General: 'general',
} as const;
export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];

export const AfterMealProtocol = {
  OneHour: '1h',
  TwoHours: '2h',
  OneThenTwo: '1h+2h',
} as const;
export type AfterMealProtocol = (typeof AfterMealProtocol)[keyof typeof AfterMealProtocol];

/** Theme preset name. UI maps this to an actual palette (see src/ui/theme/colors.ts). */
export const ConditionTheme = {
  Evergreen: 'evergreen',
  Rose: 'rose',
} as const;
export type ConditionTheme = (typeof ConditionTheme)[keyof typeof ConditionTheme];

/**
 * A preset INITIALIZES settings for a condition — it is never a second source of
 * truth. Applying a preset writes target ranges + theme + default protocol into
 * settings; the user's later edits win. Canonical mg/dL.
 */
export interface ConditionPreset {
  theme: ConditionTheme;
  fastingRange: TargetRange;
  postMealRange: TargetRange; // 1h / primary after-meal range
  postMeal2hRange?: TargetRange; // only gestational
  afterMealProtocol: AfterMealProtocol;
}

export const CONDITION_PRESETS: Record<ConditionType, ConditionPreset> = {
  gestational: {
    theme: ConditionTheme.Rose,
    fastingRange: { low: 70, high: 95 },
    postMealRange: { low: 70, high: 140 },
    postMeal2hRange: { low: 70, high: 120 },
    afterMealProtocol: AfterMealProtocol.OneHour,
  },
  general: {
    theme: ConditionTheme.Evergreen,
    fastingRange: { low: 70, high: 100 },
    postMealRange: { low: 70, high: 140 },
    postMeal2hRange: undefined,
    afterMealProtocol: AfterMealProtocol.OneHour,
  },
};
