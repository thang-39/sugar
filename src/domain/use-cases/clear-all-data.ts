import type { ReadingRepository } from '../repositories/reading-repository';
import type { SettingsRepository } from '../repositories/settings-repository';

export interface ClearAllDataDeps {
  readingRepo: ReadingRepository;
  settingsRepo: SettingsRepository;
}

/**
 * Permanently wipe all user data: every reading plus all persisted settings.
 * Clearing the settings rows resets them to `DEFAULT_SETTINGS` (see the repo's
 * `get()` fallback) — no migration is performed.
 */
export async function clearAllData(deps: ClearAllDataDeps): Promise<void> {
  await deps.readingRepo.deleteAll();
  await deps.settingsRepo.clear();
}
