import { ConditionType } from '@/domain/models/condition';
import { computeOgttSchedule } from '@/domain/use-cases/ogtt-schedule';
import { getSettingsRepository } from '@/data/repositories/factory';
import { reconcileOgttReminders } from './notification-service';

/**
 * Read postpartum settings and (re)schedule OGTT reminders. Cancels everything when
 * not in the postpartum phase. Mirror of `rescheduleWeeklySummary` — call on every
 * foreground so the 10-week and yearly reminders stay current without a background task.
 */
export async function rescheduleOgttReminders(now: number = Date.now()): Promise<void> {
  const repo = getSettingsRepository();
  const [conditionType, babyBornAt, ogttDoneAt] = await Promise.all([
    repo.get('conditionType'),
    repo.get('babyBornAt'),
    repo.get('ogttDoneAt'),
  ]);
  if (conditionType !== ConditionType.Gestational || babyBornAt === null) {
    await reconcileOgttReminders({ reminders: [], yearly: null });
    return;
  }
  await reconcileOgttReminders(computeOgttSchedule({ babyBornAt, ogttDoneAt, now }));
}
