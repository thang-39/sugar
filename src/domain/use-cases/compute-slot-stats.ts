import type { AfterMealProtocol } from '../models/condition';
import { MealTiming, type MealType } from '../models/meal';
import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';
import { evaluateReading } from './evaluate-reading';
import { buildSlotDefs, getDaySlots, type SlotDef } from './get-day-slots';

/** Per-meal aggregate for the Trends "By meal" view (gestational). */
export interface SlotStat {
  slotId: string;
  mealType: MealType;
  mealTiming: MealTiming;
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

/** Keep only the 4 design slots (fasting + 3 after-meal), dropping before-lunch/dinner. */
function perMealDefs(protocol: AfterMealProtocol): SlotDef[] {
  return buildSlotDefs(protocol).filter(
    (def) => def.mealTiming === MealTiming.After || def.id === 'before-Breakfast',
  );
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
  const span = range.to - range.from;
  const current = aggregate(readings, range.from, range.to, defs, ranges);
  const previous = aggregate(readings, range.from - span, range.from, defs, ranges);

  return defs.map((def) => {
    const cur = current.get(def.id) ?? { sum: 0, count: 0, inRange: 0 };
    const prev = previous.get(def.id) ?? { sum: 0, count: 0, inRange: 0 };
    const avgNow = cur.count > 0 ? cur.sum / cur.count : undefined;
    const avgPrev = prev.count > 0 ? prev.sum / prev.count : undefined;
    return {
      slotId: def.id,
      mealType: def.mealType,
      mealTiming: def.mealTiming,
      count: cur.count,
      average: avgNow !== undefined ? Math.round(avgNow) : undefined,
      percentInRange: cur.count > 0 ? Math.round((cur.inRange / cur.count) * 100) : 0,
      deltaAverage:
        avgNow !== undefined && avgPrev !== undefined ? Math.round(avgNow - avgPrev) : undefined,
    };
  });
}
