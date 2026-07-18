import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AfterMealProtocol } from '@/domain/models/condition';
import type { ManualReminder, SmartAfterMeal } from '@/domain/models/reminder';
import type { Reading } from '@/domain/models/reading';
import type { RangeEvaluation } from '@/domain/models/target-range';
import {
  manualReminderTrigger,
  recheckFireAt,
  smartAfterMealFireAts,
} from '@/domain/use-cases/reminder-schedule';
import i18n from '@/i18n';

const ANDROID_CHANNEL_ID = 'reminders';
/** Fixed id for the single weekly-summary notification, rescheduled on each foreground. */
const WEEKLY_SUMMARY_ID = 'weekly-summary';

/** Data attached to every reminder; a tap reads this to deep-link into Log. */
export interface ReminderPayload {
  kind: 'manual' | 'smart' | 'recheck' | 'weekly';
  mealType?: Reading['mealType'];
  mealTiming?: Reading['mealTiming'];
  hoursAfterMeal?: number;
  // Notification `data` must be assignable to `Record<string, unknown>`.
  [key: string]: unknown;
}

/** Foreground display + Android channel. Call once at app boot. */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: i18n.t('reminders.channelName'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Request permission; returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function schedule(
  identifier: string,
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data: ReminderPayload,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger,
  });
}

/**
 * Reconcile OS-scheduled manual reminders against `reminders`. Cancels every
 * `manual:*` id then reschedules the enabled/future ones. Idempotent — safe to
 * call after any edit.
 */
export async function reconcileManualReminders(reminders: ManualReminder[]): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('manual:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const now = new Date();
  for (const reminder of reminders) {
    const trigger = manualReminderTrigger(reminder, now);
    if (!trigger) continue;
    const body = reminder.label.trim() || i18n.t('reminders.notif.manualFallback');
    await schedule(
      `manual:${reminder.id}`,
      i18n.t('reminders.notif.manualTitle'),
      body,
      trigger.type === 'daily'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: trigger.hour,
            minute: trigger.minute,
          }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(trigger.at) },
      { kind: 'manual' },
    );
  }
}

/**
 * (Re)schedule smart after-meal + conditional re-check notifications for a saved
 * reading. Always cancels this reading's ids first (idempotent on re-save/edit).
 */
export async function syncRemindersForReading(
  reading: Reading,
  smart: SmartAfterMeal,
  protocol: AfterMealProtocol,
  evaluation: RangeEvaluation,
): Promise<void> {
  await cancelRemindersForReading(reading.id);
  const now = new Date();

  if (smart.enabled) {
    for (const fire of smartAfterMealFireAts(reading, smart.offset, now)) {
      await schedule(
        `smart:${reading.id}:${fire.hoursAfterMeal}`,
        i18n.t('reminders.notif.smartTitle'),
        i18n.t('reminders.notif.smartBody', {
          meal: i18n.t(`logForm.mealTypes.${reading.mealType}`),
        }),
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fire.at) },
        {
          kind: 'smart',
          mealType: reading.mealType,
          mealTiming: 'After',
          hoursAfterMeal: fire.hoursAfterMeal,
        },
      );
    }
  }

  const recheck = recheckFireAt(reading, protocol, evaluation, now);
  if (recheck !== null) {
    await schedule(
      `recheck:${reading.id}`,
      i18n.t('reminders.notif.recheckTitle'),
      i18n.t('reminders.notif.recheckBody', {
        meal: i18n.t(`logForm.mealTypes.${reading.mealType}`),
      }),
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(recheck) },
      { kind: 'recheck', mealType: reading.mealType, mealTiming: 'After', hoursAfterMeal: 2 },
    );
  }
}

/** Cancel all smart + re-check notifications tied to a reading (used on delete). */
export async function cancelRemindersForReading(readingId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter(
        (n) =>
          n.identifier === `recheck:${readingId}` || n.identifier.startsWith(`smart:${readingId}:`),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * (Re)schedule the single weekly-summary notification for `fireAt`. Reuses the
 * fixed {@link WEEKLY_SUMMARY_ID}, so scheduling replaces any existing one —
 * idempotent, safe to call on every foreground.
 */
export async function scheduleWeeklySummary(
  fireAt: Date,
  count: number,
  percentInRange: number,
): Promise<void> {
  await schedule(
    WEEKLY_SUMMARY_ID,
    i18n.t('reminders.notif.weeklyTitle'),
    i18n.t('reminders.notif.weeklyBody', { count, percent: percentInRange }),
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    { kind: 'weekly' },
  );
}

/** Cancel the weekly summary (used when the past week has too few readings). */
export async function cancelWeeklySummary(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_ID);
}

/** For the dev debug panel. */
export async function getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
