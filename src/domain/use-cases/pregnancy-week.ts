const MS_PER_DAY = 86_400_000;

/**
 * Estimated pregnancy week from an expected delivery date, assuming a 40-week term.
 * `now`/`dueDate` are unix ms. Result clamped to 1–42.
 */
export function pregnancyWeek(dueDate: number, now: number): number {
  const daysUntilDue = Math.ceil((dueDate - now) / MS_PER_DAY);
  const weeksUntilDue = Math.ceil(daysUntilDue / 7);
  const week = 40 - weeksUntilDue;
  return Math.min(42, Math.max(1, week));
}
