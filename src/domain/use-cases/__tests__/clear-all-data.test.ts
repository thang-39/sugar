import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { MealTiming, MealType } from '@/domain/models/meal';
import { type AppSettings, DEFAULT_SETTINGS } from '@/domain/models/settings';
import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import type {
  ReadingListFilter,
  ReadingRepository,
} from '@/domain/repositories/reading-repository';
import type { SettingsRepository } from '@/domain/repositories/settings-repository';
import { clearAllData } from '@/domain/use-cases/clear-all-data';

class FakeReadingRepository implements ReadingRepository {
  readonly store = new Map<string, Reading>();
  async create(reading: Reading): Promise<void> {
    this.store.set(reading.id, { ...reading });
  }
  async update(reading: Reading): Promise<void> {
    this.store.set(reading.id, { ...reading });
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async deleteAll(): Promise<void> {
    this.store.clear();
  }
  async getById(id: string): Promise<Reading | undefined> {
    const found = this.store.get(id);
    return found ? { ...found } : undefined;
  }
  async list(_filter?: ReadingListFilter): Promise<Reading[]> {
    return [...this.store.values()];
  }
  async count(_filter?: ReadingListFilter): Promise<number> {
    return this.store.size;
  }
}

// Fake mirroring the SQLite adapter: unset keys fall back to DEFAULT_SETTINGS,
// so clear() (which empties the map) resets everything to defaults.
class FakeSettingsRepository implements SettingsRepository {
  readonly store = new Map<keyof AppSettings, unknown>();
  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    return this.store.has(key)
      ? (this.store.get(key) as AppSettings[K])
      : DEFAULT_SETTINGS[key];
  }
  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    this.store.set(key, value);
  }
  async clear(): Promise<void> {
    this.store.clear();
  }
}

function makeReading(id: string): Reading {
  return {
    id,
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    hoursAfterMeal: undefined,
    notes: undefined,
    recordedAt: 1000,
    createdAt: 1000,
    updatedAt: 1000,
    syncStatus: SyncStatus.Pending,
  };
}

describe('clearAllData', () => {
  it('removes every reading', async () => {
    const readingRepo = new FakeReadingRepository();
    const settingsRepo = new FakeSettingsRepository();
    await readingRepo.create(makeReading('a'));
    await readingRepo.create(makeReading('b'));

    await clearAllData({ readingRepo, settingsRepo });

    expect(await readingRepo.count()).toBe(0);
  });

  it('resets customized settings back to defaults', async () => {
    const readingRepo = new FakeReadingRepository();
    const settingsRepo = new FakeSettingsRepository();
    await settingsRepo.set('preferredUnit', Unit.MmolL);
    await settingsRepo.set('preferredLanguage', Language.English);
    await settingsRepo.set('alertsEnabled', false);
    await settingsRepo.set('fastingRange', { low: 80, high: 120 });

    await clearAllData({ readingRepo, settingsRepo });

    expect(await settingsRepo.get('preferredUnit')).toBe(DEFAULT_SETTINGS.preferredUnit);
    expect(await settingsRepo.get('preferredLanguage')).toBe(DEFAULT_SETTINGS.preferredLanguage);
    expect(await settingsRepo.get('alertsEnabled')).toBe(DEFAULT_SETTINGS.alertsEnabled);
    expect(await settingsRepo.get('fastingRange')).toEqual(DEFAULT_SETTINGS.fastingRange);
  });
});
