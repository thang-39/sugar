import type { MealTiming, MealType } from '../models/meal';
import type { Reading } from '../models/reading';

export interface SlotDef {
  /** Stable id, e.g. 'fasting', 'after-breakfast'. */
  id: string;
  mealType: MealType;
  mealTiming: MealTiming;
  /** After-meal slots: the protocol timing (in hours) this slot represents. */
  hoursAfterMeal?: number;
}

export interface DaySlot {
  def: SlotDef;
  status: 'done' | 'pending';
  /** The reading matched to this slot, if any. */
  reading?: Reading;
  /** A later same-meal re-check (e.g. the 2h reading under a 1h+2h protocol). */
  followUp?: Reading;
}

export interface DaySlotsResult {
  slots: DaySlot[];
  /** Day readings not claimed by any slot (e.g. Snack). Never dropped. */
  extras: Reading[];
}

/**
 * Project a day's readings onto slot definitions. Pure. `date` is interpreted in the
 * device's local timezone. Duplicate handling: prefer a reading whose hoursAfterMeal
 * matches the slot's protocol timing, else the latest matching reading.
 */
export function getDaySlots(
  readings: readonly Reading[],
  date: Date,
  slotDefs: readonly SlotDef[],
): DaySlotsResult {
  const dayReadings = readings.filter((reading) => isSameLocalDay(reading.recordedAt, date));
  const claimed = new Set<string>();

  const slots: DaySlot[] = slotDefs.map((def) => {
    const candidates = dayReadings.filter(
      (reading) =>
        reading.mealType === def.mealType &&
        reading.mealTiming === def.mealTiming &&
        !claimed.has(reading.id),
    );
    const primary = pickPrimary(candidates, def);
    let followUp: Reading | undefined;
    if (primary) {
      claimed.add(primary.id);
      if (def.mealTiming === 'After' && def.hoursAfterMeal === 1) {
        followUp = candidates
          .filter((reading) => reading.id !== primary.id && (reading.hoursAfterMeal ?? 0) >= 2)
          .sort((a, b) => b.recordedAt - a.recordedAt)[0];
        if (followUp) claimed.add(followUp.id);
      }
    }
    return { def, status: primary ? 'done' : 'pending', reading: primary, followUp };
  });

  const extras = dayReadings.filter((reading) => !claimed.has(reading.id));
  return { slots, extras };
}

function pickPrimary(candidates: readonly Reading[], def: SlotDef): Reading | undefined {
  if (candidates.length === 0) return undefined;
  if (def.hoursAfterMeal != null) {
    const exact = candidates
      .filter((reading) => reading.hoursAfterMeal === def.hoursAfterMeal)
      .sort((a, b) => b.recordedAt - a.recordedAt);
    if (exact[0]) return exact[0];
  }
  return candidates.slice().sort((a, b) => b.recordedAt - a.recordedAt)[0];
}

function isSameLocalDay(timestamp: number, date: Date): boolean {
  const d = new Date(timestamp);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}
