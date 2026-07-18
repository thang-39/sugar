import { ConditionType } from '@/domain/models/condition';

/** The four mode branches, minus the theme concern (theme is derived from conditionType). */
export const LifecyclePhase = {
  General: 'general',
  Pregnant: 'pregnant',
  Postpartum: 'postpartum',
} as const;
export type LifecyclePhase = (typeof LifecyclePhase)[keyof typeof LifecyclePhase];

export interface LifecycleInput {
  conditionType: ConditionType;
  babyBornAt: number | null;
}

/** Postpartum is gestational + a recorded birth; NOT a separate ConditionType. */
export function resolveLifecyclePhase({
  conditionType,
  babyBornAt,
}: LifecycleInput): LifecyclePhase {
  if (conditionType !== ConditionType.Gestational) return LifecyclePhase.General;
  if (babyBornAt !== null) return LifecyclePhase.Postpartum;
  return LifecyclePhase.Pregnant;
}

const SNOOZE_MS = 7 * 86_400_000;

export interface BirthPromptInput {
  conditionType: ConditionType;
  babyBornAt: number | null;
  dueDate: number | null;
  snoozedAt: number | null;
  now: number;
}

/** Show the "Mẹ sinh bé chưa?" prompt: gestational, past due, unborn, not snoozed < 7d. */
export function shouldShowBirthPrompt({
  conditionType,
  babyBornAt,
  dueDate,
  snoozedAt,
  now,
}: BirthPromptInput): boolean {
  if (conditionType !== ConditionType.Gestational) return false;
  if (babyBornAt !== null) return false;
  if (dueDate === null || now < dueDate) return false;
  if (snoozedAt !== null && now - snoozedAt < SNOOZE_MS) return false;
  return true;
}
