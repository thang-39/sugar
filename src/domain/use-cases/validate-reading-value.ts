import { Unit } from '../models/unit';
import { mmolToMgdl } from './convert-unit';

export const MGDL_MIN = 20;
export const MGDL_MAX = 600;

export type ValueValidationError =
  | 'empty'
  | 'not-a-number'
  | 'not-integer' // mg/dL must be whole numbers
  | 'too-precise'; // mmol/L allows at most one decimal

export type ValueValidation =
  | { readonly ok: true; readonly mgdl: number; readonly withinNormalRange: boolean }
  | { readonly ok: false; readonly reason: ValueValidationError };

export function isWithinNormalRange(mgdl: number): boolean {
  return Number.isInteger(mgdl) && mgdl >= MGDL_MIN && mgdl <= MGDL_MAX;
}

/**
 * Parse and validate a raw value string in the given input unit.
 * Numeric-but-out-of-normal-range values are accepted with withinNormalRange=false (warn-only).
 */
export function validateReadingValue(raw: string, unit: Unit): ValueValidation {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };

  if (unit === Unit.MgDl) {
    if (!/^\d+$/.test(trimmed)) {
      const looksNumeric = /^\d+([.,]\d+)?$/.test(trimmed);
      return { ok: false, reason: looksNumeric ? 'not-integer' : 'not-a-number' };
    }
    const mgdl = Number(trimmed);
    return { ok: true, mgdl, withinNormalRange: isWithinNormalRange(mgdl) };
  }

  // mmol/L: accept '.' or ',' as decimal separator; max one decimal place.
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, reason: 'not-a-number' };
  }
  const decimals = normalized.split('.')[1];
  if (decimals !== undefined && decimals.length > 1) {
    return { ok: false, reason: 'too-precise' };
  }
  const mgdl = mmolToMgdl(Number(normalized));
  return { ok: true, mgdl, withinNormalRange: isWithinNormalRange(mgdl) };
}
