import type { MealTiming, MealType } from './meal';

export const SyncStatus = {
  Synced: 'synced',
  Pending: 'pending',
  Conflict: 'conflict',
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

export interface Reading {
  id: string;
  userId?: string;
  value: number; // integer mg/dL (canonical storage)
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal?: number; // 0–6; only meaningful when mealTiming === 'After'
  notes?: string;
  recordedAt: number; // Unix ms — when the reading was taken (user-editable)
  createdAt: number; // Unix ms — row insertion (never edited)
  updatedAt: number; // Unix ms — last edit
  syncStatus: SyncStatus;
}
