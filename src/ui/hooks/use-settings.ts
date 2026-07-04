import { create } from 'zustand';
import { type AppSettings, type Language, DEFAULT_SETTINGS } from '@/domain/models/settings';
import { SqliteSettingsRepository } from '@/data/repositories/sqlite-settings-repository';
import { getDb } from '@/data/db/client';
import i18n from '@/i18n';

// Built lazily: the DB is opened asynchronously at boot (see initDatabase), so the
// repository can only be constructed once `getDb()` is valid — which is guaranteed
// by the time `initialize`/`updateSetting` run (both fire after the boot gate).
let settingsRepo: SqliteSettingsRepository | undefined;
function getSettingsRepo(): SqliteSettingsRepository {
  if (!settingsRepo) settingsRepo = new SqliteSettingsRepository(getDb());
  return settingsRepo;
}

interface SettingsStore extends AppSettings {
  isInitialized: boolean;
  initError?: string;
  initialize: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  isInitialized: false,
  initialize: async () => {
    if (get().isInitialized) return;
    // Read every persisted key in parallel — the repo hits SQLite once per key.
    const [
      preferredUnit,
      preferredLanguage,
      fastingRange,
      postMealRange,
      alertsEnabled,
      onboardingDone,
    ] = await Promise.all([
      getSettingsRepo().get('preferredUnit'),
      getSettingsRepo().get('preferredLanguage'),
      getSettingsRepo().get('fastingRange'),
      getSettingsRepo().get('postMealRange'),
      getSettingsRepo().get('alertsEnabled'),
      getSettingsRepo().get('onboardingDone'),
    ]);

    set({
      preferredUnit,
      preferredLanguage,
      fastingRange,
      postMealRange,
      alertsEnabled,
      onboardingDone,
      isInitialized: true,
    });
  },
  updateSetting: async (key, value) => {
    await getSettingsRepo().set(key, value);
    // Typed narrow instead of `any`: the pair (key, value) is exactly Pick<AppSettings, K>.
    set({ [key]: value } as Pick<AppSettings, typeof key>);
    if (key === 'preferredLanguage') {
      void i18n.changeLanguage(value as Language);
    }
  },
}));
