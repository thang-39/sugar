import type { MealType } from './meal';
import type { Unit } from './unit';

/** Locale-independent date/time parts for the CSV `Date`/`Time` columns. */
export interface RecordedAtParts {
  date: string; // ISO yyyy-MM-dd (device timezone)
  time: string; // HH:mm 24h (device timezone)
}

/** Inputs the pure CSV generator needs; keeps the domain free of i18n and clocks. */
export interface ExportOptions {
  unit: Unit;
  mealLabels: Record<MealType, string>; // localized by the caller (app language)
  formatRecordedAt: (recordedAt: number) => RecordedAtParts;
}

/** Time-range presets offered on the Export screen. */
export const ExportRangePreset = {
  All: 'all',
  Last14Days: 'last14d',
  Last30Days: 'last30d',
  Last3Months: 'last3m',
  Last6Months: 'last6m',
  Custom: 'custom',
} as const;
export type ExportRangePreset = (typeof ExportRangePreset)[keyof typeof ExportRangePreset];
