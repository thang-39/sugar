import { formatDate, formatTime, formatDateTime, formatValue } from '../format';
import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';

// Local-time constructor: month is 0-indexed. 2026-07-05 08:03 local.
const d = new Date(2026, 6, 5, 8, 3);

describe('formatDate', () => {
  it('formats Vietnamese as dd/MM/yyyy with zero-padding', () => {
    expect(formatDate(d, Language.Vietnamese)).toBe('05/07/2026');
  });

  it('returns a non-empty string for English locale', () => {
    expect(formatDate(d, Language.English).length).toBeGreaterThan(0);
  });
});

describe('formatTime', () => {
  it('formats Vietnamese as 24-hour HH:mm with zero-padding', () => {
    expect(formatTime(d, Language.Vietnamese)).toBe('08:03');
  });

  it('formats a value past noon in 24-hour for Vietnamese', () => {
    expect(formatTime(new Date(2026, 6, 5, 18, 30), Language.Vietnamese)).toBe('18:30');
  });
});

describe('formatDateTime', () => {
  it('joins date and time for Vietnamese', () => {
    expect(formatDateTime(d, Language.Vietnamese)).toBe('05/07/2026 08:03');
  });
});

describe('formatValue', () => {
  it('renders mg/dL as an integer string', () => {
    expect(formatValue(120, Unit.MgDl)).toBe('120');
  });

  it('renders mmol/L with exactly one decimal place', () => {
    expect(formatValue(101, Unit.MmolL)).toBe('5.6');
    // 180 * 0.0555 = 9.99 → rounds to 10.0, shown with the trailing decimal.
    expect(formatValue(180, Unit.MmolL)).toBe('10.0');
  });
});
