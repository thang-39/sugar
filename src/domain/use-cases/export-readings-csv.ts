import type { ExportOptions } from '../models/export';
import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import { Unit } from '../models/unit';
import { mgdlToMmol } from './convert-unit';

// Leading BOM: as a JS string it is U+FEFF; once the file is encoded to UTF-16LE
// (see src/data/export) it becomes the FF FE byte-order mark Excel needs to detect
// the encoding — the fix for garbled Vietnamese when opening in Excel (esp. macOS).
const BOM = '﻿';
// Tab-separated, NOT comma: Excel's list separator is `;` under many locales
// (including Vietnamese), so a comma-delimited file lands everything in one column.
// A tab is unambiguous across locales — this is Excel's own "Unicode Text" format.
const DELIMITER = '\t';
const HEADER = ['Date', 'Time', 'Value', 'Unit', 'Meal', 'Timing', 'Hours After', 'Notes'];

/** RFC 4180 style: quote a field iff it contains the delimiter (tab), a quote, CR or LF; double inner quotes. */
function escapeField(field: string): string {
  if (/[\t"\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatValue(mgdl: number, unit: Unit): string {
  // Locale-independent: mg/dL integer; mmol/L one decimal with a `.` separator.
  return unit === Unit.MmolL ? mgdlToMmol(mgdl).toFixed(1) : String(mgdl);
}

/**
 * Generate the locked-spec CSV (PRD "CSV format") for the already-filtered,
 * caller-ordered readings. Pure — no i18n, filesystem, or clock access.
 */
export function exportReadingsCsv(readings: readonly Reading[], opts: ExportOptions): string {
  const rows = [HEADER.join(DELIMITER)];

  for (const reading of readings) {
    const { date, time } = opts.formatRecordedAt(reading.recordedAt);
    const isAfter = reading.mealTiming === MealTiming.After;
    const cells = [
      date,
      time,
      formatValue(reading.value, opts.unit),
      opts.unit,
      opts.mealLabels[reading.mealType],
      reading.mealTiming, // locked: Before / After (English)
      isAfter && reading.hoursAfterMeal !== undefined ? String(reading.hoursAfterMeal) : '',
      reading.notes ?? '',
    ];
    rows.push(cells.map(escapeField).join(DELIMITER));
  }

  return BOM + rows.join('\r\n');
}
