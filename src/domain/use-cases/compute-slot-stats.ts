import { AfterMealProtocol } from '../models/condition';
import { MealTiming, MealType } from '../models/meal';
import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';
import { evaluateReading } from './evaluate-reading';
import { getDaySlots, type SlotDef } from './get-day-slots';

/** Per-meal aggregate for the Trends "By meal" view (gestational). */
export interface SlotStat {
  slotId: string;
  mealType: MealType;
  mealTiming: MealTiming;
  /** After-meal band this slot represents (1 or 2 hours); undefined for fasting. */
  hoursAfterMeal?: number;
  count: number;
  /** mg/dL, rounded; undefined when count === 0. */
  average?: number;
  /** 0–100; 0 when count === 0. */
  percentInRange: number;
  /** average(this period) − average(previous period), mg/dL; undefined if either period is empty. Negative = improved. */
  deltaAverage?: number;
}

interface Bucket {
  sum: number;
  count: number;
  inRange: number;
}

/** Local-midnight timestamp for a reading's day (device timezone). */
function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Sum/count/in-range per slot over the window [from, to] (inclusive). Uses the same
 * day → slot projection as the report, so a slot's readings include the 1h primary
 * and any 2h follow-up captured by getDaySlots.
 */
function aggregate(
  readings: readonly Reading[],
  from: number,
  to: number,
  defs: readonly SlotDef[],
  ranges: TargetRanges,
): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>(defs.map((def) => [def.id, { sum: 0, count: 0, inRange: 0 }]));
  const inWindow = readings.filter((reading) => reading.recordedAt >= from && reading.recordedAt <= to);
  const days = [...new Set(inWindow.map((reading) => dayStart(reading.recordedAt)))];

  for (const dayTs of days) {
    const { slots } = getDaySlots(inWindow, new Date(dayTs), defs);
    for (const slot of slots) {
      const bucket = buckets.get(slot.def.id);
      if (!bucket) continue;
      for (const reading of [slot.reading, slot.followUp]) {
        if (!reading) continue;
        bucket.sum += reading.value;
        bucket.count += 1;
        if (evaluateReading(reading, ranges) === RangeEvaluation.InRange) bucket.inRange += 1;
      }
    }
  }
  return buckets;
}

const AFTER_MEALS: readonly MealType[] = [MealType.Breakfast, MealType.Lunch, MealType.Dinner];

/**
 * Per-meal slot defs: fasting (before breakfast) + one after-meal slot per meal.
 * Under the 1h+2h protocol each meal splits into a separate 1h and a 2h slot so the
 * two bands (different targets) are never averaged together; single protocols keep
 * one after-meal slot per meal. before-lunch/dinner are intentionally excluded.
 */
function perMealDefs(protocol: AfterMealProtocol): SlotDef[] {
  const fasting: SlotDef = {
    id: 'before-Breakfast',
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
  };
  if (protocol === AfterMealProtocol.OneThenTwo) {
    return [
      fasting,
      ...AFTER_MEALS.flatMap((meal): SlotDef[] => [
        { id: `after-${meal}-1h`, mealType: meal, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
        { id: `after-${meal}-2h`, mealType: meal, mealTiming: MealTiming.After, hoursAfterMeal: 2 },
      ]),
    ];
  }
  const hours = protocol === AfterMealProtocol.TwoHours ? 2 : 1;
  return [
    fasting,
    ...AFTER_MEALS.map((meal): SlotDef => ({
      id: `after-${meal}`,
      mealType: meal,
      mealTiming: MealTiming.After,
      hoursAfterMeal: hours,
    })),
  ];
}

/**
 * Per-meal blood-sugar stats for the 4 gestational slots over [range.from, range.to].
 * `deltaAverage` compares against the immediately preceding window of equal width.
 * Pure — no React/Expo, no clock; the window is supplied by the caller.
 */
export function computeSlotStats(
  readings: readonly Reading[],
  range: { from: number; to: number },
  protocol: AfterMealProtocol,
  ranges: TargetRanges,
): SlotStat[] {
  const defs = perMealDefs(protocol);
  // Aggregate with the 2h slot processed before its 1h sibling: getDaySlots' 1h slot
  // captures a later >=2h reading as a follow-up, which would otherwise steal the 2h
  // reading before its own slot can claim it. Output stays in display order (1h, 2h).
  const aggDefs = [...defs].sort((a, b) => (b.hoursAfterMeal ?? 0) - (a.hoursAfterMeal ?? 0));
  const span = range.to - range.from;
  const current = aggregate(readings, range.from, range.to, aggDefs, ranges);
  const previous = aggregate(readings, range.from - span, range.from, aggDefs, ranges);

  return defs.map((def) => {
    const cur = current.get(def.id) ?? { sum: 0, count: 0, inRange: 0 };
    const prev = previous.get(def.id) ?? { sum: 0, count: 0, inRange: 0 };
    const avgNow = cur.count > 0 ? cur.sum / cur.count : undefined;
    const avgPrev = prev.count > 0 ? prev.sum / prev.count : undefined;
    return {
      slotId: def.id,
      mealType: def.mealType,
      mealTiming: def.mealTiming,
      hoursAfterMeal: def.hoursAfterMeal,
      count: cur.count,
      average: avgNow !== undefined ? Math.round(avgNow) : undefined,
      percentInRange: cur.count > 0 ? Math.round((cur.inRange / cur.count) * 100) : 0,
      deltaAverage:
        avgNow !== undefined && avgPrev !== undefined ? Math.round(avgNow - avgPrev) : undefined,
    };
  });
}
