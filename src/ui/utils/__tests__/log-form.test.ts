import { getDefaultMealType, convertValueString } from '../log-form';
import { MealType } from '@/domain/models/meal';
import { Unit } from '@/domain/models/unit';

// Fixed calendar day; only the hour/minute matter for the meal-type boundaries.
function at(hour: number, minute = 0): Date {
  return new Date(2026, 0, 1, hour, minute);
}

describe('getDefaultMealType', () => {
  it('returns Breakfast before 11:00', () => {
    expect(getDefaultMealType(at(0))).toBe(MealType.Breakfast);
    expect(getDefaultMealType(at(10, 59))).toBe(MealType.Breakfast);
  });

  it('returns Lunch from 11:00 up to 15:00', () => {
    expect(getDefaultMealType(at(11, 0))).toBe(MealType.Lunch);
    expect(getDefaultMealType(at(14, 59))).toBe(MealType.Lunch);
  });

  it('returns Snack from 15:00 up to 18:00', () => {
    expect(getDefaultMealType(at(15, 0))).toBe(MealType.Snack);
    expect(getDefaultMealType(at(17, 59))).toBe(MealType.Snack);
  });

  it('returns Dinner from 18:00 onward', () => {
    expect(getDefaultMealType(at(18, 0))).toBe(MealType.Dinner);
    expect(getDefaultMealType(at(23, 0))).toBe(MealType.Dinner);
  });
});

describe('convertValueString', () => {
  it('holds the round-trip for a typed mmol/L value (PRD round-trip rule)', () => {
    const asMgdl = convertValueString('5.6', Unit.MmolL, Unit.MgDl);
    expect(asMgdl).toBe('101');
    expect(convertValueString(asMgdl, Unit.MgDl, Unit.MmolL)).toBe('5.6');
  });

  it('normalizes a comma decimal separator', () => {
    expect(convertValueString('5,6', Unit.MmolL, Unit.MgDl)).toBe('101');
  });

  it('returns the raw string unchanged when the unit is the same', () => {
    expect(convertValueString('123', Unit.MgDl, Unit.MgDl)).toBe('123');
  });

  it('passes through empty and non-numeric input unchanged', () => {
    expect(convertValueString('', Unit.MgDl, Unit.MmolL)).toBe('');
    expect(convertValueString('abc', Unit.MgDl, Unit.MmolL)).toBe('abc');
  });
});
