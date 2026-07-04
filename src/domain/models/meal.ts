export const MealType = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Snack: 'Snack',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

export const MealTiming = {
  Before: 'Before',
  After: 'After',
} as const;
export type MealTiming = (typeof MealTiming)[keyof typeof MealTiming];
