const WEEK = 7 * 86_400_000;

export interface OgttReminder {
  /** Stable notification identifier: 'ogtt:4w' | 'ogtt:10w' | 'ogtt:yearly'. */
  id: string;
  /** Unix ms the reminder should fire. */
  fireAt: number;
}

export interface OgttSchedule {
  /** Future one-shots inside the 4–12 week screening window. */
  reminders: OgttReminder[];
  /** The single recurring reminder once screening is done/overdue (recomputed each app open). */
  yearly: OgttReminder | null;
}

export interface OgttScheduleInput {
  babyBornAt: number;
  ogttDoneAt: number | null;
  now: number;
}

/** Next same-calendar-day-of-year strictly after `now`, anchored on `anchor` (device tz). */
function nextAnnual(anchor: number, now: number): number {
  const d = new Date(anchor);
  while (d.getTime() <= now) {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.getTime();
}

/**
 * Postpartum OGTT reminders. Inside the 4–12 week window (unmarked) → one-shots at
 * birth+4w and birth+10w (only future ones survive). Once marked done OR past 12
 * weeks → a single yearly reminder anchored on the done date (or the 12-week mark).
 * Pure — call `rescheduleOgttReminders` on each foreground so the set stays current.
 */
export function computeOgttSchedule({
  babyBornAt,
  ogttDoneAt,
  now,
}: OgttScheduleInput): OgttSchedule {
  const fourW = babyBornAt + 4 * WEEK;
  const tenW = babyBornAt + 10 * WEEK;
  const twelveW = babyBornAt + 12 * WEEK;

  const inScreeningWindow = ogttDoneAt === null && now < twelveW;
  if (inScreeningWindow) {
    const reminders: OgttReminder[] = [];
    if (fourW > now) reminders.push({ id: 'ogtt:4w', fireAt: fourW });
    if (tenW > now) reminders.push({ id: 'ogtt:10w', fireAt: tenW });
    return { reminders, yearly: null };
  }

  const anchor = ogttDoneAt ?? twelveW;
  return { reminders: [], yearly: { id: 'ogtt:yearly', fireAt: nextAnnual(anchor, now) } };
}
