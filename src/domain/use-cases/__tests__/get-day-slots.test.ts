import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { getDaySlots, type SlotDef } from '@/domain/use-cases/get-day-slots';

// Minimal reading factory — only fields getDaySlots reads matter.
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

const date = new Date(2026, 6, 11); // 11 Jul 2026, local
const at = (h: number, m = 0): number => new Date(2026, 6, 11, h, m).getTime();

const CLASSIC: SlotDef[] = [
  { id: 'fasting', mealType: MealType.Breakfast, mealTiming: MealTiming.Before },
  { id: 'after-breakfast', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
  { id: 'after-lunch', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
  { id: 'after-dinner', mealType: MealType.Dinner, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
];

describe('getDaySlots', () => {
  it('marks matched slots done and unmatched slots pending', () => {
    const readings = [r({ id: 'a', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, recordedAt: at(6, 30) })];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'fasting')?.status).toBe('done');
    expect(slots.find((s) => s.def.id === 'fasting')?.reading?.id).toBe('a');
    expect(slots.find((s) => s.def.id === 'after-lunch')?.status).toBe('pending');
  });

  it('prefers the reading whose hoursAfterMeal matches the slot, over the latest', () => {
    const readings = [
      r({ id: 'later-2h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, recordedAt: at(9, 30) }),
      r({ id: 'match-1h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, recordedAt: at(8, 30) }),
    ];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'after-breakfast')?.reading?.id).toBe('match-1h');
  });

  it('falls back to the latest matching reading when none matches the protocol timing', () => {
    const readings = [
      r({ id: 'early', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 3, recordedAt: at(13, 0) }),
      r({ id: 'late', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 3, recordedAt: at(14, 0) }),
    ];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'after-lunch')?.reading?.id).toBe('late');
  });

  it('routes Snack (and other unmatched readings) to extras, never dropping them', () => {
    const readings = [
      r({ id: 'snack', mealType: MealType.Snack, mealTiming: MealTiming.After, hoursAfterMeal: 1, recordedAt: at(10, 20) }),
    ];
    const { slots, extras } = getDaySlots(readings, date, CLASSIC);
    expect(slots.every((s) => s.status === 'pending')).toBe(true);
    expect(extras.map((e) => e.id)).toEqual(['snack']);
  });

  it('attaches a 2h re-check as followUp on a 1h slot (1h+2h protocol)', () => {
    const readings = [
      r({ id: 'bk-1h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, recordedAt: at(8, 30) }),
      r({ id: 'bk-2h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, recordedAt: at(9, 30) }),
    ];
    const { slots, extras } = getDaySlots(readings, date, CLASSIC);
    const slot = slots.find((s) => s.def.id === 'after-breakfast');
    expect(slot?.reading?.id).toBe('bk-1h');
    expect(slot?.followUp?.id).toBe('bk-2h');
    expect(extras).toHaveLength(0); // follow-up is claimed, not dropped to extras
  });

  it('only counts readings from the given day (device local tz boundary)', () => {
    const readings = [
      r({ id: 'yesterday', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, recordedAt: new Date(2026, 6, 10, 23, 59).getTime() }),
      r({ id: 'today', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, recordedAt: new Date(2026, 6, 11, 0, 1).getTime() }),
    ];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'fasting')?.reading?.id).toBe('today');
  });
});
