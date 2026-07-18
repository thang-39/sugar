import type { TargetRanges } from '@/domain/models/target-range';
import { buildWeeklySummary, nextSundayEvening } from '@/domain/use-cases/build-weekly-summary';

import { getReadingRepository, getSettingsRepository } from '../repositories/factory';
import { cancelWeeklySummary, scheduleWeeklySummary } from './notification-service';

const WEEK_MS = 7 * 86_400_000;

/**
 * Reconcile the weekly-summary notification against the last 7 days of readings.
 * Schedules it for next Sunday 19:30 when the week is active (>= 5 readings),
 * otherwise cancels it. Idempotent — call on every app foreground.
 */
export async function rescheduleWeeklySummary(now: Date = new Date()): Promise<void> {
  const nowMs = now.getTime();
  const readings = await getReadingRepository().list({ from: nowMs - WEEK_MS, to: nowMs });

  const settings = getSettingsRepository();
  const [fasting, postMeal, postMeal2h] = await Promise.all([
    settings.get('fastingRange'),
    settings.get('postMealRange'),
    settings.get('postMeal2hRange'),
  ]);
  const ranges: TargetRanges = { fasting, postMeal, postMeal2h: postMeal2h ?? undefined };

  const summary = buildWeeklySummary(readings, ranges, now);
  if (!summary) {
    await cancelWeeklySummary();
    return;
  }
  await scheduleWeeklySummary(nextSundayEvening(now), summary.count, summary.percentInRange);
}
