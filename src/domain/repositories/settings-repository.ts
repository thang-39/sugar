import type { AppSettings } from '../models/settings';

export interface SettingsRepository {
  get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>;
  /**
   * Whether the user has ever stored this key. `get()` alone cannot answer it:
   * a missing row and a row holding the default value both read back as the
   * default, so "chose Vietnamese" is indistinguishable from "never chose".
   * Needed to seed a first-run default without ever overwriting a real choice.
   */
  has<K extends keyof AppSettings>(key: K): Promise<boolean>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  /**
   * Remove every persisted setting row. Because `get()` falls back to
   * `DEFAULT_SETTINGS`, clearing the rows resets all settings to their defaults.
   */
  clear(): Promise<void>;
}
