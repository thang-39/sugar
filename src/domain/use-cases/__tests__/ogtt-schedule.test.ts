import { computeOgttSchedule } from '@/domain/use-cases/ogtt-schedule';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

describe('computeOgttSchedule', () => {
  const born = new Date(2026, 0, 1).getTime();

  it('schedules the 4w and 10w reminders right after birth', () => {
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: null, now: born + DAY });
    expect(s.reminders.map((r) => r.id)).toEqual(['ogtt:4w', 'ogtt:10w']);
    expect(s.reminders[0]!.fireAt).toBe(born + 4 * WEEK);
    expect(s.reminders[1]!.fireAt).toBe(born + 10 * WEEK);
    expect(s.yearly).toBeNull();
  });

  it('drops the 4w reminder once it is in the past', () => {
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: null, now: born + 5 * WEEK });
    expect(s.reminders.map((r) => r.id)).toEqual(['ogtt:10w']);
    expect(s.yearly).toBeNull();
  });

  it('switches to a future yearly reminder once marked done', () => {
    const done = born + 6 * WEEK;
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: done, now: born + 7 * WEEK });
    expect(s.reminders).toEqual([]);
    expect(s.yearly).not.toBeNull();
    expect(s.yearly!.id).toBe('ogtt:yearly');
    expect(s.yearly!.fireAt).toBeGreaterThan(born + 7 * WEEK);
  });

  it('switches to yearly after 12 weeks even if never marked', () => {
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: null, now: born + 13 * WEEK });
    expect(s.reminders).toEqual([]);
    expect(s.yearly).not.toBeNull();
  });
});
