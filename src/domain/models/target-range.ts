export interface TargetRange {
  low: number; // mg/dL, inclusive
  high: number; // mg/dL, inclusive
}

export interface TargetRanges {
  fasting: TargetRange; // used when mealTiming === 'Before'
  postMeal: TargetRange; // used when mealTiming === 'After' (1h / primary)
  postMeal2h?: TargetRange; // gestational: readings >= 2h after a meal, when set
}

export const RangeEvaluation = {
  InRange: 'in-range',
  Low: 'low',
  High: 'high',
} as const;
export type RangeEvaluation = (typeof RangeEvaluation)[keyof typeof RangeEvaluation];
