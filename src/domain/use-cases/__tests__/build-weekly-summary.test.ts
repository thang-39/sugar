import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import type { TargetRanges } from '@/domain/models/target-range';
import { buildWeeklySummary, nextSundayEvening } from '@/domain/use-cases/build-weekly-summary';

const NOW = new Date(2026, 6, 12, 10, 0, 0); // Sunday 2026-07-12 10:00 local
const DAY = 86_400_000;

const RANGES: TargetRanges = {
  fasting: { low: 70, high: 100 },
  postMeal: { low: 70, high: 140 },
};

function reading(overrides: Partial<Reading>): Reading {
  return {
    id: 'r',
    value: 90, // in the fasting range by default
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    recordedAt: NOW.getTime() - DAY, // yesterday, inside the window
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'pending',
    ...overrides,
  };
}

/** n readings inside the 7-day window, each `value`. */
function readings(n: number, value: number): Reading[] {
  return Array.from({ length: n }, (_, i) => reading({ id: `r${i}`, value, recordedAt: NOW.getTime() - (i + 1) * 3_600_000 }));
}

describe('buildWeeklySummary', () => {
  it('returns null when the week has fewer than 5 readings', () => {
    expect(buildWeeklySummary(readings(4, 90), RANGES, NOW)).toBeNull();
  });

  it('summarises count and percent in range for a week with >= 5 readings', () => {
    // 4 in-range (90) + 1 high (200) → 5 readings, 80% in range.
    const week = [...readings(4, 90), reading({ id: 'high', value: 200, recordedAt: NOW.getTime() - 3 * DAY })];
    expect(buildWeeklySummary(week, RANGES, NOW)).toEqual({ count: 5, percentInRange: 80 });
  });

  it('ignores readings older than 7 days', () => {
    const week = readings(5, 90);
    const stale = reading({ id: 'stale', value: 90, recordedAt: NOW.getTime() - 8 * DAY });
    expect(buildWeeklySummary([...week, stale], RANGES, NOW)).toEqual({ count: 5, percentInRange: 100 });
  });

  it('ignores readings in the future (after now)', () => {
    const week = readings(5, 90);
    const future = reading({ id: 'future', value: 90, recordedAt: NOW.getTime() + DAY });
    expect(buildWeeklySummary([...week, future], RANGES, NOW)).toEqual({ count: 5, percentInRange: 100 });
  });
});

describe('nextSundayEvening', () => {
  it('returns this Sunday 19:30 when called Sunday morning', () => {
    // NOW = Sunday 10:00 → today 19:30
    expect(nextSundayEvening(NOW)).toEqual(new Date(2026, 6, 12, 19, 30, 0, 0));
  });

  it('rolls to next Sunday when called Sunday after 19:30', () => {
    const sundayLate = new Date(2026, 6, 12, 20, 0, 0); // Sunday 20:00
    expect(nextSundayEvening(sundayLate)).toEqual(new Date(2026, 6, 19, 19, 30, 0, 0));
  });

  it('returns the coming Sunday from a weekday', () => {
    const wednesday = new Date(2026, 6, 15, 8, 0, 0); // Wed 2026-07-15
    expect(nextSundayEvening(wednesday)).toEqual(new Date(2026, 6, 19, 19, 30, 0, 0));
  });
});
