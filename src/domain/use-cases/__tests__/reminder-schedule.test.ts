import type { ManualReminder } from '@/domain/models/reminder';
import { MealTiming, MealType } from '@/domain/models/meal';
import { RangeEvaluation } from '@/domain/models/target-range';
import type { Reading } from '@/domain/models/reading';
import {
  manualReminderTrigger,
  smartAfterMealFireAts,
  recheckFireAt,
} from '@/domain/use-cases/reminder-schedule';

const NOW = new Date(2026, 6, 11, 8, 0, 0); // 2026-07-11 08:00 local

function reading(overrides: Partial<Reading>): Reading {
  return {
    id: 'r1',
    value: 100,
    mealType: MealType.Lunch,
    mealTiming: MealTiming.Before,
    recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime(),
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('manualReminderTrigger', () => {
  it('maps a daily reminder to hour/minute', () => {
    const r: ManualReminder = { id: 'm1', label: 'Đói', time: '06:30', enabled: true, repeat: 'daily' };
    expect(manualReminderTrigger(r, NOW)).toEqual({ type: 'daily', hour: 6, minute: 30 });
  });

  it('maps a future one-time reminder to an absolute timestamp', () => {
    const r: ManualReminder = {
      id: 'm2', label: 'Khám', time: '09:15', enabled: true, repeat: 'once', date: '2026-07-20',
    };
    const at = new Date(2026, 6, 20, 9, 15, 0).getTime();
    expect(manualReminderTrigger(r, NOW)).toEqual({ type: 'date', at });
  });

  it('returns null for a one-time reminder whose datetime already passed', () => {
    const r: ManualReminder = {
      id: 'm3', label: 'Cũ', time: '07:00', enabled: true, repeat: 'once', date: '2026-07-11',
    };
    expect(manualReminderTrigger(r, NOW)).toBeNull(); // 07:00 < NOW 08:00
  });

  it('returns null for a disabled reminder', () => {
    const r: ManualReminder = { id: 'm4', label: 'Off', time: '06:30', enabled: false, repeat: 'daily' };
    expect(manualReminderTrigger(r, NOW)).toBeNull();
  });

  it('returns null for a one-time reminder missing its date', () => {
    const r: ManualReminder = { id: 'm5', label: 'Hẹn', time: '09:15', enabled: true, repeat: 'once' };
    expect(manualReminderTrigger(r, NOW)).toBeNull();
  });
});

describe('smartAfterMealFireAts', () => {
  it('returns nothing for an after-meal reading (anchor is BEFORE only)', () => {
    const after = reading({ mealTiming: MealTiming.After, hoursAfterMeal: 1 });
    expect(smartAfterMealFireAts(after, '1h', NOW)).toEqual([]);
  });

  it('schedules a single 1h offset from recordedAt', () => {
    const r = reading({ recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, '1h', NOW)).toEqual([
      { hoursAfterMeal: 1, at: new Date(2026, 6, 11, 13, 0, 0).getTime() },
    ]);
  });

  it('schedules a single 2h offset from recordedAt', () => {
    const r = reading({ recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, '2h', NOW)).toEqual([
      { hoursAfterMeal: 2, at: new Date(2026, 6, 11, 14, 0, 0).getTime() },
    ]);
  });

  it('schedules both offsets when offset is "both"', () => {
    const r = reading({ recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, 'both', NOW)).toEqual([
      { hoursAfterMeal: 1, at: new Date(2026, 6, 11, 13, 0, 0).getTime() },
      { hoursAfterMeal: 2, at: new Date(2026, 6, 11, 14, 0, 0).getTime() },
    ]);
  });

  it('drops offsets whose fire time is already in the past', () => {
    // recordedAt 07:00, NOW 08:00 → 1h fire (08:00) is not > NOW, dropped; 2h (09:00) kept.
    const r = reading({ recordedAt: new Date(2026, 6, 11, 7, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, 'both', NOW)).toEqual([
      { hoursAfterMeal: 2, at: new Date(2026, 6, 11, 9, 0, 0).getTime() },
    ]);
  });
});

describe('recheckFireAt', () => {
  const base = reading({
    mealTiming: MealTiming.After,
    hoursAfterMeal: 1,
    recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime(),
  });

  it('schedules a +1h re-check for an out-of-range 1h reading under 1h+2h', () => {
    expect(recheckFireAt(base, '1h+2h', RangeEvaluation.High, NOW)).toBe(
      new Date(2026, 6, 11, 13, 0, 0).getTime(),
    );
  });

  it('returns null when the 1h reading is in range', () => {
    expect(recheckFireAt(base, '1h+2h', RangeEvaluation.InRange, NOW)).toBeNull();
  });

  it('returns null under a non-1h+2h protocol', () => {
    expect(recheckFireAt(base, '1h', RangeEvaluation.High, NOW)).toBeNull();
  });

  it('returns null for a 2h after-meal reading (only 1h readings re-check)', () => {
    const twoHour = reading({
      mealTiming: MealTiming.After,
      hoursAfterMeal: 2,
      recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime(),
    });
    expect(recheckFireAt(twoHour, '1h+2h', RangeEvaluation.High, NOW)).toBeNull();
  });

  it('returns null for a before-meal reading (only after-meal readings re-check)', () => {
    const before = reading({
      mealTiming: MealTiming.Before,
      recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime(),
    });
    expect(recheckFireAt(before, '1h+2h', RangeEvaluation.High, NOW)).toBeNull();
  });

  it('returns null when the re-check time is already in the past', () => {
    const old = reading({
      mealTiming: MealTiming.After, hoursAfterMeal: 1,
      recordedAt: new Date(2026, 6, 11, 6, 0, 0).getTime(), // +1h = 07:00 < NOW 08:00
    });
    expect(recheckFireAt(old, '1h+2h', RangeEvaluation.High, NOW)).toBeNull();
  });
});
