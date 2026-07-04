import { eq } from 'drizzle-orm';
import { type AppSettings, DEFAULT_SETTINGS } from '@/domain/models/settings';
import type { SettingsRepository } from '@/domain/repositories/settings-repository';
import type { SugarDb } from '../db/database';
import { appSettings } from '../db/schema';

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SugarDb) {}

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const row = this.db.select().from(appSettings).where(eq(appSettings.id, key)).get();
    if (row === undefined) return DEFAULT_SETTINGS[key];
    return JSON.parse(row.value) as AppSettings[K];
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const serialized = JSON.stringify(value);
    const now = Date.now();
    this.db
      .insert(appSettings)
      .values({ id: key, key, value: serialized, updatedAt: now })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { value: serialized, updatedAt: now },
      })
      .run();
  }
}
