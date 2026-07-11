import type { AfterMealProtocol } from '../models/condition';
import { MealTiming } from '../models/meal';
import type { ManualReminder, SmartOffset } from '../models/reminder';
import type { Reading } from '../models/reading';
import { RangeEvaluation } from '../models/target-range';

/** A repeating daily trigger at a local wall-clock time. */
export interface DailyTrigger {
  type: 'daily';
  hour: number;
  minute: number;
}
/** A one-shot trigger at an absolute instant. */
export interface DateTrigger {
  type: 'date';
  at: number; // epoch ms
}
export type ReminderTrigger = DailyTrigger | DateTrigger;

/** One scheduled smart after-meal fire. */
export interface SmartFire {
  hoursAfterMeal: number;
  at: number; // epoch ms
}

/** Parse "HH:mm" → [hour, minute]; NaN-safe callers pass validated UI input. */
function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':');
  return { hour: Number(h), minute: Number(m) };
}

/** Local calendar day "YYYY-MM-DD" + "HH:mm" → epoch ms in the device tz. */
function localDateTime(date: string, time: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const { hour, minute } = parseTime(time);
  return new Date(y as number, (mo as number) - 1, d as number, hour, minute, 0, 0).getTime();
}

/**
 * The trigger for a manual reminder, or null if it should not be scheduled
 * (disabled, or a one-time reminder whose instant has already passed).
 */
export function manualReminderTrigger(reminder: ManualReminder, now: Date): ReminderTrigger | null {
  if (!reminder.enabled) return null;
  if (reminder.repeat === 'once') {
    if (!reminder.date) return null;
    const at = localDateTime(reminder.date, reminder.time);
    return at > now.getTime() ? { type: 'date', at } : null;
  }
  const { hour, minute } = parseTime(reminder.time);
  return { type: 'daily', hour, minute };
}

function offsetHours(offset: SmartOffset): number[] {
  if (offset === 'both') return [1, 2];
  if (offset === '2h') return [2];
  return [1];
}

/**
 * Smart after-meal fires for a just-saved reading. Only BEFORE-meal readings
 * anchor smart reminders; each offset fires at recordedAt + offset hours.
 * Fires already in the past (relative to `now`) are dropped.
 */
export function smartAfterMealFireAts(
  reading: Reading,
  offset: SmartOffset,
  now: Date,
): SmartFire[] {
  if (reading.mealTiming !== MealTiming.Before) return [];
  const nowMs = now.getTime();
  return offsetHours(offset)
    .map((hoursAfterMeal) => ({
      hoursAfterMeal,
      at: reading.recordedAt + hoursAfterMeal * 3_600_000,
    }))
    .filter((fire) => fire.at > nowMs);
}

/**
 * The conditional +1h re-check instant for an out-of-range 1h after-meal reading
 * under the 1h+2h protocol, or null. In-range readings and other protocols → null.
 */
export function recheckFireAt(
  reading: Reading,
  protocol: AfterMealProtocol,
  evaluation: RangeEvaluation,
  now: Date,
): number | null {
  if (protocol !== '1h+2h') return null;
  if (reading.mealTiming !== MealTiming.After) return null;
  if (reading.hoursAfterMeal !== 1) return null;
  if (evaluation === RangeEvaluation.InRange) return null;
  const at = reading.recordedAt + 3_600_000;
  return at > now.getTime() ? at : null;
}
