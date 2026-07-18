import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';
import { evaluateReading } from './evaluate-reading';

const WEEK_MS = 7 * 86_400_000;
/** Don't nag the postpartum/lapsed: only summarise a genuinely active week. */
const MIN_READINGS = 5;
const SUMMARY_HOUR = 19;
const SUMMARY_MINUTE = 30;

/** A gentle end-of-week recap. Never carries a guilt framing — just counts + coverage. */
export interface WeeklySummary {
  count: number;
  /** 0–100, share of the week's readings inside target. */
  percentInRange: number;
}

/**
 * Recap of the last 7 days, or null when the week has fewer than {@link MIN_READINGS}
 * readings (so a quiet week produces no notification at all). Pure — the clock is
 * supplied by the caller.
 */
export function buildWeeklySummary(
  readings: readonly Reading[],
  ranges: TargetRanges,
  now: Date,
): WeeklySummary | null {
  const nowMs = now.getTime();
  const from = nowMs - WEEK_MS;
  const week = readings.filter((r) => r.recordedAt > from && r.recordedAt <= nowMs);
  if (week.length < MIN_READINGS) return null;

  const inRange = week.filter((r) => evaluateReading(r, ranges) === RangeEvaluation.InRange).length;
  return {
    count: week.length,
    percentInRange: Math.round((inRange / week.length) * 100),
  };
}

/**
 * The next Sunday at 19:30 local, strictly after `now`. Called Sunday before 19:30
 * returns today; on or after 19:30 rolls to the following Sunday.
 */
export function nextSundayEvening(now: Date): Date {
  const result = new Date(now);
  result.setHours(SUMMARY_HOUR, SUMMARY_MINUTE, 0, 0);
  const daysUntilSunday = (7 - now.getDay()) % 7; // getDay(): 0 = Sunday
  result.setDate(result.getDate() + daysUntilSunday);
  if (result.getTime() <= now.getTime()) {
    result.setDate(result.getDate() + 7);
  }
  return result;
}
