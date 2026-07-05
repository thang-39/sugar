import type { ReadingRepository } from '@/domain/repositories/reading-repository';
import type { ReadingUseCaseDeps } from '@/domain/use-cases/reading-use-case-deps';

import { getDb } from '../db/client';
import { generateId } from '../id';
import { SqliteReadingRepository } from './sqlite-reading-repository';

/**
 * Composition helpers used by the UI layer. Repositories bind to the live DB
 * handle (`getDb()` is valid after the boot gate in `app/_layout.tsx`), so these
 * must only be called at render/interaction time, never at module load.
 */
export function getReadingRepository(): ReadingRepository {
  return new SqliteReadingRepository(getDb());
}

/** Standard dependency bundle for the reading use cases (create/update/delete). */
export function readingUseCaseDeps(): ReadingUseCaseDeps {
  return { repository: getReadingRepository(), generateId, now: Date.now };
}
