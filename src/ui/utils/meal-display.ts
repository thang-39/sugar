import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import { MealType } from '@/domain/models/meal';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Ionicons nearest to the Material Symbols used in the reference design. */
export const mealIcon: Record<MealType, IconName> = {
  [MealType.Breakfast]: 'cafe-outline',
  [MealType.Lunch]: 'restaurant-outline',
  [MealType.Dinner]: 'moon-outline',
  [MealType.Snack]: 'fast-food-outline',
};
