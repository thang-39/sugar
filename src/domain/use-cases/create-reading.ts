import { MealTiming, type MealType } from '../models/meal';
import { type Reading, SyncStatus } from '../models/reading';
import type { ReadingUseCaseDeps } from './reading-use-case-deps';

export interface CreateReadingInput {
  value: number; // integer mg/dL (already converted from the input unit)
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal?: number; // ignored unless mealTiming === 'After'
  notes?: string;
  recordedAt: number; // Unix ms
}

export async function createReading(
  input: CreateReadingInput,
  deps: ReadingUseCaseDeps,
): Promise<Reading> {
  const timestamp = deps.now();
  const reading: Reading = {
    id: deps.generateId(),
    value: input.value,
    mealType: input.mealType,
    mealTiming: input.mealTiming,
    hoursAfterMeal:
      input.mealTiming === MealTiming.After ? input.hoursAfterMeal : undefined,
    notes: input.notes,
    recordedAt: input.recordedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: SyncStatus.Pending,
  };
  await deps.repository.create(reading);
  return reading;
}
