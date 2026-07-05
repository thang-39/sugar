import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Date-only display. Vietnamese uses `dd/MM/yyyy`; English uses the locale
 * default (PRD "Dates, times, timezone"). All formatting is in the device's
 * current timezone — `Date` getters are local by nature.
 */
export function formatDate(date: Date, language: Language): string {
  if (language === Language.Vietnamese) {
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Time-only display. Vietnamese is 24-hour `HH:mm`; English uses the locale default. */
export function formatTime(date: Date, language: Language): string {
  if (language === Language.Vietnamese) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/** Combined date + time, single spaced. */
export function formatDateTime(date: Date, language: Language): string {
  return `${formatDate(date, language)} ${formatTime(date, language)}`;
}

/**
 * Render a stored integer mg/dL value in the preferred display unit.
 * mg/dL → integer string; mmol/L → one decimal place (PRD rounding rule).
 */
export function formatValue(mgdl: number, unit: Unit): string {
  return unit === Unit.MmolL ? mgdlToMmol(mgdl).toFixed(1) : mgdl.toString();
}
