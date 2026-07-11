import type { AfterMealProtocol } from './condition';

/** Reminder repeat behavior. */
export const RepeatKind = {
  Daily: 'daily',
  Once: 'once',
} as const;
export type RepeatKind = (typeof RepeatKind)[keyof typeof RepeatKind];

/**
 * A user-managed measurement reminder. `time` is a local wall-clock "HH:mm"
 * (24h). For `repeat: 'once'`, `date` is a local calendar day "YYYY-MM-DD"
 * (undefined for daily).
 */
export interface ManualReminder {
  id: string;
  label: string;
  time: string; // "HH:mm", 24h local
  enabled: boolean;
  repeat: RepeatKind;
  date?: string; // "YYYY-MM-DD", only for repeat === 'once'
}

/** Smart after-meal offset. `both` = fire at 1h AND 2h. */
export const SmartOffset = {
  OneHour: '1h',
  TwoHours: '2h',
  Both: 'both',
} as const;
export type SmartOffset = (typeof SmartOffset)[keyof typeof SmartOffset];

export interface SmartAfterMeal {
  enabled: boolean;
  offset: SmartOffset;
}

/** The smart-reminder default offset implied by the doctor's after-meal protocol. */
export function smartOffsetForProtocol(protocol: AfterMealProtocol): SmartOffset {
  switch (protocol) {
    case '2h':
      return SmartOffset.TwoHours;
    case '1h+2h':
      return SmartOffset.Both;
    default:
      return SmartOffset.OneHour;
  }
}
