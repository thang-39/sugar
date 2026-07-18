import type { AfterMealProtocol, ConditionType } from './condition';
import type { ManualReminder, SmartAfterMeal } from './reminder';
import type { TargetRange } from './target-range';
import { Unit } from './unit';

export const Language = {
  Vietnamese: 'vi',
  English: 'en',
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export interface AppSettings {
  preferredUnit: Unit;
  preferredLanguage: Language;
  fastingRange: TargetRange; // stored in mg/dL
  postMealRange: TargetRange; // stored in mg/dL (1h / primary)
  alertsEnabled: boolean;
  onboardingDone: boolean;
  // --- Session 10: condition profile (JSON kv, no migration) ---
  conditionType: ConditionType;
  /** Expected delivery date, unix ms. `null` = not set (persisted as JSON null). */
  dueDate: number | null;
  afterMealProtocol: AfterMealProtocol;
  /** 2h after-meal range (gestational). `null` = not set. */
  postMeal2hRange: TargetRange | null;
  // --- Session 11: reminders (JSON kv, no migration) ---
  manualReminders: ManualReminder[];
  smartAfterMeal: SmartAfterMeal;
  // --- Session 13: doctor report ---
  /** Number of successful PDF report exports. Session 16 gates on it. */
  reportCount: number;
  // --- Session 15: monetization ---
  /** Anonymous analytics opt-out (default on). Never records a glucose value. */
  analyticsEnabled: boolean;
  // --- Session 17.5: local backup ---
  /** Unix ms of the last successful local backup export. `null` = never backed up. */
  lastLocalBackupAt: number | null;
  // --- Session 20: retention loop ---
  /** Unix ms the store-review prompt was last requested. `null` = never asked (one-shot). */
  reviewAskedAt: number | null;
  /**
   * Stable support code shown in About (dev entitlement adapter persists it here).
   * `null` = not generated yet. Session 23's RevenueCat adapter ignores this and
   * returns `Purchases.getAppUserID()` instead.
   */
  supportCode: string | null;
  // --- Session 21: postpartum lifecycle (JSON kv, no migration) ---
  /** Unix ms the baby was born. `null` = not yet born; `!= null` = postpartum phase. */
  babyBornAt: number | null;
  /** Unix ms the post-due-date "Mẹ sinh bé chưa?" prompt was last snoozed. `null` = never. */
  postpartumPromptSnoozedAt: number | null;
  /** Unix ms the postpartum OGTT re-check was marked done. `null` = not done. */
  ogttDoneAt: number | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  preferredUnit: Unit.MgDl,
  preferredLanguage: Language.Vietnamese,
  fastingRange: { low: 70, high: 100 },
  postMealRange: { low: 70, high: 140 },
  alertsEnabled: true,
  onboardingDone: false,
  conditionType: 'general',
  dueDate: null,
  afterMealProtocol: '1h',
  postMeal2hRange: null,
  manualReminders: [],
  smartAfterMeal: { enabled: false, offset: '1h' },
  reportCount: 0,
  analyticsEnabled: true,
  lastLocalBackupAt: null,
  reviewAskedAt: null,
  supportCode: null,
  babyBornAt: null,
  postpartumPromptSnoozedAt: null,
  ogttDoneAt: null,
};
