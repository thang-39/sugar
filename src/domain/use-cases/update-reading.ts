import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import type { ReadingUseCaseDeps } from './reading-use-case-deps';

export type UpdateReadingPatch = Partial<
  Pick<
    Reading,
    'value' | 'mealType' | 'mealTiming' | 'hoursAfterMeal' | 'notes' | 'recordedAt'
  >
>;

export async function updateReading(
  id: string,
  patch: UpdateReadingPatch,
  deps: ReadingUseCaseDeps,
): Promise<Reading> {
  const existing = await deps.repository.getById(id);
  if (existing === undefined) {
    throw new Error(`Reading not found: ${id}`);
  }
  const merged: Reading = {
    ...existing,
    ...patch,
    updatedAt: deps.now(),
  };
  // hoursAfterMeal is only meaningful when timing is After.
  merged.hoursAfterMeal =
    merged.mealTiming === MealTiming.After ? merged.hoursAfterMeal : undefined;
  await deps.repository.update(merged);
  return merged;
}
