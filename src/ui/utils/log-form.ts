import { MealType } from '@/domain/models/meal';
import { Unit } from '@/domain/models/unit';
import { mgdlToMmol, mmolToMgdl } from '@/domain/use-cases/convert-unit';

/**
 * Smart default for the meal-type chip, derived from the time of day.
 * Boundaries (PRD "Log Reading Screen"): <11 Breakfast, <15 Lunch, <18 Snack, else Dinner.
 * `date` is injected so this stays pure and testable.
 */
export function getDefaultMealType(date: Date): MealType {
  const hour = date.getHours();
  if (hour < 11) return MealType.Breakfast;
  if (hour < 15) return MealType.Lunch;
  if (hour < 18) return MealType.Snack;
  return MealType.Dinner;
}

/**
 * Re-express a raw value string when the display unit toggles, so the user's
 * typed number is preserved across the switch (PRD "Input, Formatting & Locale Rules"
 * round-trip rule). Accepts both `.` and `,` as the mmol/L decimal separator.
 *
 * Returns the input unchanged when there is nothing to convert: same unit, empty,
 * or non-numeric text (validation surfaces those at save time).
 */
export function convertValueString(raw: string, from: Unit, to: Unit): string {
  if (from === to) return raw;
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return raw;
  const num = Number(normalized);
  if (Number.isNaN(num)) return raw;
  return to === Unit.MmolL ? mgdlToMmol(num).toString() : mmolToMgdl(num).toString();
}
