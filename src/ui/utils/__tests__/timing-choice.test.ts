import { MealTiming } from '@/domain/models/meal';
import {
  timingChoiceToFields,
  fieldsToTimingChoice,
  type TimingChoice,
} from '@/ui/utils/timing-choice';

describe('timingChoiceToFields', () => {
  it('maps before to Before with no hours', () => {
    expect(timingChoiceToFields('before')).toEqual({
      mealTiming: MealTiming.Before,
      hoursAfterMeal: undefined,
    });
  });

  it('maps after1 to After + 1 hour', () => {
    expect(timingChoiceToFields('after1')).toEqual({
      mealTiming: MealTiming.After,
      hoursAfterMeal: 1,
    });
  });

  it('maps after2 to After + 2 hours', () => {
    expect(timingChoiceToFields('after2')).toEqual({
      mealTiming: MealTiming.After,
      hoursAfterMeal: 2,
    });
  });
});

describe('fieldsToTimingChoice', () => {
  it('returns before for Before timing', () => {
    expect(fieldsToTimingChoice(MealTiming.Before, undefined)).toBe('before');
  });

  it('returns after1 for After with 1 hour', () => {
    expect(fieldsToTimingChoice(MealTiming.After, 1)).toBe('after1');
  });

  it('returns after2 for After with 2+ hours', () => {
    expect(fieldsToTimingChoice(MealTiming.After, 2)).toBe('after2');
    expect(fieldsToTimingChoice(MealTiming.After, 3)).toBe('after2');
  });

  it('defaults legacy After readings with 0 hours to after1', () => {
    expect(fieldsToTimingChoice(MealTiming.After, 0)).toBe('after1');
    expect(fieldsToTimingChoice(MealTiming.After, undefined)).toBe('after1');
  });

  const choices: TimingChoice[] = ['before', 'after1', 'after2'];
  it.each(choices)('round-trips %s', (choice) => {
    const { mealTiming, hoursAfterMeal } = timingChoiceToFields(choice);
    expect(fieldsToTimingChoice(mealTiming, hoursAfterMeal)).toBe(choice);
  });
});
