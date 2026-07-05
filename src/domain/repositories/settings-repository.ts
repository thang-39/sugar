import type { AppSettings } from '../models/settings';

export interface SettingsRepository {
  get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  /**
   * Remove every persisted setting row. Because `get()` falls back to
   * `DEFAULT_SETTINGS`, clearing the rows resets all settings to their defaults.
   */
  clear(): Promise<void>;
}
