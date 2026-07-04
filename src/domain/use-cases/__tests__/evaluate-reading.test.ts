import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { MealTiming } from '@/domain/models/meal';
import { RangeEvaluation, type TargetRanges } from '@/domain/models/target-range';

const ranges: TargetRanges = {
  fasting: { low: 70, high: 100 },
  postMeal: { low: 70, high: 140 },
};

describe('evaluateReading', () => {
  describe('Before → fasting range (70–100)', () => {
    it('flags low', () => {
      expect(evaluateReading({ value: 65, mealTiming: MealTiming.Before }, ranges)).toBe(
        RangeEvaluation.Low,
      );
    });
    it('flags in-range', () => {
      expect(evaluateReading({ value: 85, mealTiming: MealTiming.Before }, ranges)).toBe(
        RangeEvaluation.InRange,
      );
    });
    it('flags high', () => {
      expect(evaluateReading({ value: 110, mealTiming: MealTiming.Before }, ranges)).toBe(
        RangeEvaluation.High,
      );
    });
  });

  describe('After → post-meal range (70–140)', () => {
    it('treats 110 as in-range (would be high for fasting)', () => {
      expect(evaluateReading({ value: 110, mealTiming: MealTiming.After }, ranges)).toBe(
        RangeEvaluation.InRange,
      );
    });
    it('flags high above 140', () => {
      expect(evaluateReading({ value: 150, mealTiming: MealTiming.After }, ranges)).toBe(
        RangeEvaluation.High,
      );
    });
    it('flags low below 70', () => {
      expect(evaluateReading({ value: 60, mealTiming: MealTiming.After }, ranges)).toBe(
        RangeEvaluation.Low,
      );
    });
  });

  it('treats range bounds as inclusive', () => {
    expect(evaluateReading({ value: 70, mealTiming: MealTiming.Before }, ranges)).toBe(
      RangeEvaluation.InRange,
    );
    expect(evaluateReading({ value: 100, mealTiming: MealTiming.Before }, ranges)).toBe(
      RangeEvaluation.InRange,
    );
  });
});
