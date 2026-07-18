import { AfterMealProtocol } from '@/domain/models/condition';
import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import type { TargetRanges } from '@/domain/models/target-range';
import { computeSlotStats } from '@/domain/use-cases/compute-slot-stats';

// Minimal reading factory — only the fields computeSlotStats reads matter.
function r(partial: Partial<Reading> & { id: string; recordedAt: number }): Reading {
  return {
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    hoursAfterMeal: undefined,
    notes: undefined,
    createdAt: partial.recordedAt,
    updatedAt: partial.recordedAt,
    syncStatus: SyncStatus.Pending,
    ...partial,
  };
}

// Gestational ranges so the 2h band is exercised.
const RANGES: TargetRanges = {
  fasting: { low: 70, high: 95 },
  postMeal: { low: 70, high: 140 },
  postMeal2h: { low: 70, high: 120 },
};

// Current window = all of 8 Jul; span = 1 day → previous window = all of 7 Jul.
const FROM = new Date(2026, 6, 8, 0, 0, 0, 0).getTime();
const TO = new Date(2026, 6, 9, 0, 0, 0, 0).getTime();
const RANGE = { from: FROM, to: TO };
// Timestamps inside the current (8 Jul) and previous (7 Jul) windows.
const now = (h: number, m = 0): number => new Date(2026, 6, 8, h, m).getTime();
const prev = (h: number, m = 0): number => new Date(2026, 6, 7, h, m).getTime();

const bySlot = (stats: ReturnType<typeof computeSlotStats>, id: string) =>
  stats.find((s) => s.slotId === id);

describe('computeSlotStats', () => {
  it('returns the 4 design slots in order (fasting + 3 after-meal)', () => {
    const stats = computeSlotStats([], RANGE, AfterMealProtocol.OneHour, RANGES);
    expect(stats.map((s) => s.slotId)).toEqual([
      'before-Breakfast',
      'after-Breakfast',
      'after-Lunch',
      'after-Dinner',
    ]);
    expect(bySlot(stats, 'before-Breakfast')?.mealTiming).toBe(MealTiming.Before);
    expect(bySlot(stats, 'after-Lunch')?.mealType).toBe(MealType.Lunch);
  });

  it('reports an empty slot as count 0 with no average and 0% in range', () => {
    const stats = computeSlotStats([], RANGE, AfterMealProtocol.OneHour, RANGES);
    const fasting = bySlot(stats, 'before-Breakfast');
    expect(fasting?.count).toBe(0);
    expect(fasting?.average).toBeUndefined();
    expect(fasting?.percentInRange).toBe(0);
    expect(fasting?.deltaAverage).toBeUndefined();
  });

  it('averages both the 1h primary and the 2h follow-up into the after-meal slot (1h+2h)', () => {
    const readings = [
      r({ id: 'bk-1h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 150, recordedAt: now(8) }),
      r({ id: 'bk-2h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, value: 130, recordedAt: now(9) }),
    ];
    const stats = computeSlotStats(readings, RANGE, AfterMealProtocol.OneThenTwo, RANGES);
    const slot = bySlot(stats, 'after-Breakfast');
    expect(slot?.count).toBe(2);
    expect(slot?.average).toBe(140); // (150 + 130) / 2
  });

  it('ignores Snack readings — they belong to no slot', () => {
    const readings = [
      r({ id: 'snack', mealType: MealType.Snack, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 200, recordedAt: now(10) }),
    ];
    const stats = computeSlotStats(readings, RANGE, AfterMealProtocol.OneHour, RANGES);
    expect(stats.every((s) => s.count === 0)).toBe(true);
  });

  it('evaluates in-range against the 2h band for readings >= 2h after a meal', () => {
    // 125 is in range under the 1h band (<=140) but out of range under the 2h band (<=120).
    const readings = [
      r({ id: 'ln-2h', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 2, value: 125, recordedAt: now(14) }),
    ];
    const stats = computeSlotStats(readings, RANGE, AfterMealProtocol.TwoHours, RANGES);
    const slot = bySlot(stats, 'after-Lunch');
    expect(slot?.count).toBe(1);
    expect(slot?.percentInRange).toBe(0); // out of range via the 2h band
  });

  it('computes deltaAverage as current minus previous period (negative = improved)', () => {
    const readings = [
      r({ id: 'prev', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 160, recordedAt: prev(8) }),
      r({ id: 'cur', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 120, recordedAt: now(8) }),
    ];
    const stats = computeSlotStats(readings, RANGE, AfterMealProtocol.OneHour, RANGES);
    const slot = bySlot(stats, 'after-Breakfast');
    expect(slot?.average).toBe(120); // current period only
    expect(slot?.deltaAverage).toBe(-40); // 120 − 160
  });

  it('leaves deltaAverage undefined when the previous period has no readings', () => {
    const readings = [
      r({ id: 'cur', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 120, recordedAt: now(8) }),
    ];
    const stats = computeSlotStats(readings, RANGE, AfterMealProtocol.OneHour, RANGES);
    expect(bySlot(stats, 'after-Breakfast')?.deltaAverage).toBeUndefined();
  });
});
