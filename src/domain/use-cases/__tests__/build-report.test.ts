import { AfterMealProtocol } from '@/domain/models/condition';
import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { RangeEvaluation, type TargetRanges } from '@/domain/models/target-range';
import { buildReport } from '@/domain/use-cases/build-report';

const RANGES: TargetRanges = {
  fasting: { low: 70, high: 95 },
  postMeal: { low: 70, high: 140 },
  postMeal2h: { low: 70, high: 120 },
};

// Format mg/dL as-is (integer) — tests assert on canonical values.
const fmtValue = (mgdl: number): string => String(mgdl);
const fmtDay = (ts: number): string => {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

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

const at = (day: number, h: number, m = 0): number => new Date(2026, 6, day, h, m).getTime();

const opts = (protocol: AfterMealProtocol = AfterMealProtocol.OneHour) => ({
  unit: 'mg/dL' as const,
  ranges: RANGES,
  protocol,
  formatValue: fmtValue,
  formatDay: fmtDay,
});

// Meal column order in a row: 0 = breakfast, 1 = lunch, 2 = dinner.
describe('buildReport', () => {
  it('maps a day onto 3 meal columns with before + after sub-cells (protocol 1h)', () => {
    const readings = [
      r({ id: 'bf', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, value: 88, recordedAt: at(11, 6, 30) }),
      r({ id: 'ba', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 130, recordedAt: at(11, 8, 30) }),
      r({ id: 'la', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 155, recordedAt: at(11, 13, 30) }),
    ];
    const { rows, hasSecondHour } = buildReport(readings, opts());
    expect(hasSecondHour).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.date).toBe('11/07');
    // Breakfast: before = fasting reading, after = 1h.
    expect(rows[0]?.meals[0]?.before.value).toBe('88');
    expect(rows[0]?.meals[0]?.before.status).toBe(RangeEvaluation.InRange);
    expect(rows[0]?.meals[0]?.after.value).toBe('130');
    // Lunch after 155 > 140 → high, flagged.
    expect(rows[0]?.meals[1]?.after.value).toBe('155');
    expect(rows[0]?.meals[1]?.after.isOutOfRange).toBe(true);
    // Lunch before missing, dinner entirely missing.
    expect(rows[0]?.meals[1]?.before.status).toBe('none');
    expect(rows[0]?.meals[2]?.after.status).toBe('none');
    // 2h sub-cell is always empty when protocol is not 1h+2h.
    expect(rows[0]?.meals[0]?.after2h.status).toBe('none');
  });

  it('fills the 2h sub-cell only when the 1h reading is out of range (1h+2h)', () => {
    const readings = [
      // Breakfast: 1h high (150) → 2h re-check present (110) → shown.
      r({ id: 'ba1', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 150, recordedAt: at(11, 8, 30) }),
      r({ id: 'ba2', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, value: 110, recordedAt: at(11, 9, 30) }),
      // Lunch: 1h in range (130) → 2h re-check present (125) but must NOT be shown.
      r({ id: 'la1', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 130, recordedAt: at(11, 13, 30) }),
      r({ id: 'la2', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 2, value: 125, recordedAt: at(11, 14, 30) }),
    ];
    const { rows, hasSecondHour } = buildReport(readings, opts(AfterMealProtocol.OneThenTwo));
    expect(hasSecondHour).toBe(true);
    // Breakfast 1h high, each sub-cell colored independently.
    expect(rows[0]?.meals[0]?.after.value).toBe('150');
    expect(rows[0]?.meals[0]?.after.isOutOfRange).toBe(true);
    expect(rows[0]?.meals[0]?.after2h.value).toBe('110'); // within 70–120 → in range
    expect(rows[0]?.meals[0]?.after2h.status).toBe(RangeEvaluation.InRange);
    // Lunch 1h in range → 2h hidden despite a recorded 125.
    expect(rows[0]?.meals[1]?.after.status).toBe(RangeEvaluation.InRange);
    expect(rows[0]?.meals[1]?.after2h.value).toBeUndefined();
    expect(rows[0]?.meals[1]?.after2h.status).toBe('none');
  });

  it('leaves the 2h sub-cell empty when 1h is out of range but no 2h was recorded', () => {
    const readings = [
      r({ id: 'ba1', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 150, recordedAt: at(11, 8, 30) }),
    ];
    const { rows } = buildReport(readings, opts(AfterMealProtocol.OneThenTwo));
    expect(rows[0]?.meals[0]?.after.isOutOfRange).toBe(true);
    expect(rows[0]?.meals[0]?.after2h.value).toBeUndefined();
  });

  it('uses the 2h reading as the after value under the 2h-only protocol', () => {
    const readings = [
      r({ id: 'ba', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, value: 118, recordedAt: at(11, 9, 30) }),
    ];
    const { rows, hasSecondHour } = buildReport(readings, opts(AfterMealProtocol.TwoHours));
    expect(hasSecondHour).toBe(false);
    expect(rows[0]?.meals[0]?.after.value).toBe('118');
    expect(rows[0]?.meals[0]?.after2h.status).toBe('none');
  });

  it('excludes Snack from the grid but counts it in the stats', () => {
    const readings = [
      r({ id: 'bf', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, value: 88, recordedAt: at(11, 6, 30) }),
      r({ id: 'snack', mealType: MealType.Snack, mealTiming: MealTiming.After, hoursAfterMeal: 1, value: 200, recordedAt: at(11, 10, 0) }),
    ];
    const { rows, stats } = buildReport(readings, opts());
    // Snack appears in no meal sub-cell.
    const allValues = rows[0]?.meals.flatMap((m) => [m.before.value, m.after.value, m.after2h.value]) ?? [];
    expect(allValues).not.toContain('200');
    expect(stats.total).toBe(2);
    expect(stats.inRange).toBe(1); // fasting 88 in range, snack 200 high
    expect(stats.percentInRange).toBe(50);
  });

  it('produces one chronological row per day that has readings', () => {
    const readings = [
      r({ id: 'd2', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, value: 90, recordedAt: at(12, 6, 30) }),
      r({ id: 'd1', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, value: 85, recordedAt: at(11, 6, 30) }),
    ];
    const { rows } = buildReport(readings, opts());
    expect(rows.map((row) => row.date)).toEqual(['11/07', '12/07']);
  });

  it('returns zeroed stats and no rows for an empty range', () => {
    const { rows, stats } = buildReport([], opts());
    expect(rows).toEqual([]);
    expect(stats).toEqual({ total: 0, inRange: 0, percentInRange: 0 });
  });
});
