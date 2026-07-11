import { pregnancyWeek } from '@/domain/use-cases/pregnancy-week';

const DAY = 86_400_000;

describe('pregnancyWeek', () => {
  const due = new Date(2026, 8, 15).getTime(); // fixed, tz-agnostic for these deltas

  it('is week 40 on the due date', () => {
    expect(pregnancyWeek(due, due)).toBe(40);
  });

  it('is week 36 four weeks before the due date', () => {
    expect(pregnancyWeek(due, due - 28 * DAY)).toBe(36);
  });

  it('clamps to 1 well before term (40 weeks out)', () => {
    expect(pregnancyWeek(due, due - 280 * DAY)).toBe(1);
  });

  it('clamps to 42 after the due date has passed', () => {
    expect(pregnancyWeek(due, due + 21 * DAY)).toBe(42);
  });
});
