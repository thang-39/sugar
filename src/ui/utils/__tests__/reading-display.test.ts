import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { RangeEvaluation } from '@/domain/models/target-range';
import { colors } from '@/ui/theme';
import { contrastRatio } from '@/ui/utils/contrast';
import { readingDisplay, statusBadge, statusColor } from '@/ui/utils/reading-display';

const AA_NORMAL = 4.5;

function reading(partial: Partial<Reading>): Reading {
  return {
    id: 'r1',
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    recordedAt: 0,
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'pending',
    ...partial,
  };
}

describe('readingDisplay', () => {
  it('labels a Before+Breakfast reading as fasting with the bed icon', () => {
    const d = readingDisplay(reading({ mealTiming: MealTiming.Before, mealType: MealType.Breakfast }));
    expect(d.titleKey).toBe('today.slots.before.Breakfast');
    expect(d.icon).toBe('bed-outline');
  });

  it('labels an After reading with the after key and the meal icon', () => {
    const d = readingDisplay(reading({ mealTiming: MealTiming.After, mealType: MealType.Lunch }));
    expect(d.titleKey).toBe('today.slots.after.Lunch');
    expect(d.icon).toBe('restaurant-outline');
  });

  it('uses the before key for a non-breakfast Before reading (not fasting)', () => {
    const d = readingDisplay(reading({ mealTiming: MealTiming.Before, mealType: MealType.Dinner }));
    expect(d.titleKey).toBe('today.slots.before.Dinner');
    expect(d.icon).toBe('moon-outline');
  });
});

describe('statusColor contrast on white card', () => {
  const cases = [RangeEvaluation.InRange, RangeEvaluation.Low, RangeEvaluation.High];
  it.each(cases)('%s status text meets AA on card', (evaluation) => {
    expect(contrastRatio(statusColor(evaluation), colors.card)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('statusBadge text-on-tint contrast', () => {
  const cases = [RangeEvaluation.InRange, RangeEvaluation.Low, RangeEvaluation.High];
  it.each(cases)('%s badge text meets AA on its tint', (evaluation) => {
    const { color, backgroundColor } = statusBadge(evaluation);
    expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
