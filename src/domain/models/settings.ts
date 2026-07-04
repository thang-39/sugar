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
  postMealRange: TargetRange; // stored in mg/dL
  alertsEnabled: boolean;
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  preferredUnit: Unit.MgDl,
  preferredLanguage: Language.Vietnamese,
  fastingRange: { low: 70, high: 100 },
  postMealRange: { low: 70, high: 140 },
  alertsEnabled: true,
  onboardingDone: false,
};
