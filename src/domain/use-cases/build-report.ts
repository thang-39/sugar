import { AfterMealProtocol } from '../models/condition';
import { MealTiming, MealType } from '../models/meal';
import type { Reading } from '../models/reading';
import type { MealCell, ReportModel, ReportRow, ReportStats, SubCell } from '../models/report';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';
import type { Unit } from '../models/unit';
import { evaluateReading } from './evaluate-reading';
import { getDaySlots, type SlotDef } from './get-day-slots';

export interface BuildReportOptions {
  unit: Unit;
  ranges: TargetRanges;
  protocol: AfterMealProtocol;
  /** Format a canonical mg/dL value in the preferred unit. */
  formatValue: (mgdl: number) => string;
  /** Format a day timestamp as a short localized label, e.g. "11/07". */
  formatDay: (ts: number) => string;
}

/** Column order: breakfast, lunch, dinner. */
const MEALS: readonly MealType[] = [MealType.Breakfast, MealType.Lunch, MealType.Dinner];
const EMPTY_CELL: SubCell = { status: 'none', isOutOfRange: false };

/** before + after slot defs per meal. after-slot timing follows the protocol. */
function reportSlotDefs(protocol: AfterMealProtocol): SlotDef[] {
  // 2h-only protocol makes the 2h reading the after value; otherwise the 1h
  // reading is primary and getDaySlots captures a 2h re-check as followUp.
  const afterHours = protocol === AfterMealProtocol.TwoHours ? 2 : 1;
  return MEALS.flatMap((meal) => [
    { id: `before-${meal}`, mealType: meal, mealTiming: MealTiming.Before },
    { id: `after-${meal}`, mealType: meal, mealTiming: MealTiming.After, hoursAfterMeal: afterHours },
  ]);
}

/** Local-midnight timestamp for a reading's day (device timezone). */
function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Project readings onto a day-by-day doctor's grid. Pure — all formatting is
 * injected. One row per calendar day that has readings, chronological. Three
 * meal columns, each with before + after (+ a 2h re-check under 1h+2h). Snack
 * and other unmatched readings never appear in the grid but count in the stats.
 */
export function buildReport(readings: readonly Reading[], opts: BuildReportOptions): ReportModel {
  const hasSecondHour = opts.protocol === AfterMealProtocol.OneThenTwo;
  const defs = reportSlotDefs(opts.protocol);

  const dayTimestamps = [...new Set(readings.map((reading) => dayStart(reading.recordedAt)))].sort(
    (a, b) => a - b,
  );

  const rows: ReportRow[] = dayTimestamps.map((ts) => {
    const { slots } = getDaySlots(readings, new Date(ts), defs);
    const byId = new Map(slots.map((slot) => [slot.def.id, slot]));
    const meals: MealCell[] = MEALS.map((meal) => {
      const before = byId.get(`before-${meal}`);
      const after = byId.get(`after-${meal}`);
      return buildMealCell(before?.reading, after?.reading, after?.followUp, hasSecondHour, opts);
    });
    return { date: opts.formatDay(ts), meals };
  });

  return { rows, stats: computeStats(readings, opts.ranges), hasSecondHour };
}

function subCell(reading: Reading | undefined, opts: BuildReportOptions): SubCell {
  if (!reading) return EMPTY_CELL;
  const status = evaluateReading(reading, opts.ranges);
  return {
    value: opts.formatValue(reading.value),
    status,
    isOutOfRange: status !== RangeEvaluation.InRange,
  };
}

function buildMealCell(
  before: Reading | undefined,
  after: Reading | undefined,
  followUp: Reading | undefined,
  hasSecondHour: boolean,
  opts: BuildReportOptions,
): MealCell {
  const afterCell = subCell(after, opts);
  // The 2h sub-cell shows only under 1h+2h AND when the 1h reading was out of range.
  const show2h = hasSecondHour && afterCell.isOutOfRange && followUp !== undefined;
  return {
    before: subCell(before, opts),
    after: afterCell,
    after2h: show2h ? subCell(followUp, opts) : EMPTY_CELL,
  };
}

function computeStats(readings: readonly Reading[], ranges: TargetRanges): ReportStats {
  const total = readings.length;
  const inRange = readings.filter(
    (reading) => evaluateReading(reading, ranges) === RangeEvaluation.InRange,
  ).length;
  const percentInRange = total === 0 ? 0 : Math.round((inRange / total) * 100);
  return { total, inRange, percentInRange };
}
