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
};
