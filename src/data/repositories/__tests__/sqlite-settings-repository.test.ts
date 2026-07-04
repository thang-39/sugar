import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { SqliteSettingsRepository } from '@/data/repositories/sqlite-settings-repository';
import { createTestDb } from '@/test-support/test-db';

function newRepo(): SqliteSettingsRepository {
  return new SqliteSettingsRepository(createTestDb());
}

describe('SqliteSettingsRepository', () => {
  it('returns defaults when a key is unset', async () => {
    const repo = newRepo();
    expect(await repo.get('preferredUnit')).toBe(Unit.MgDl);
    expect(await repo.get('preferredLanguage')).toBe(Language.Vietnamese);
    expect(await repo.get('fastingRange')).toEqual({ low: 70, high: 100 });
    expect(await repo.get('postMealRange')).toEqual({ low: 70, high: 140 });
    expect(await repo.get('alertsEnabled')).toBe(true);
    expect(await repo.get('onboardingDone')).toBe(false);
  });

  it('round-trips typed scalar values', async () => {
    const repo = newRepo();
    await repo.set('preferredUnit', Unit.MmolL);
    await repo.set('preferredLanguage', Language.English);
    await repo.set('alertsEnabled', false);
    await repo.set('onboardingDone', true);
    expect(await repo.get('preferredUnit')).toBe(Unit.MmolL);
    expect(await repo.get('preferredLanguage')).toBe(Language.English);
    expect(await repo.get('alertsEnabled')).toBe(false);
    expect(await repo.get('onboardingDone')).toBe(true);
  });

  it('round-trips a target-range object', async () => {
    const repo = newRepo();
    await repo.set('fastingRange', { low: 80, high: 110 });
    expect(await repo.get('fastingRange')).toEqual({ low: 80, high: 110 });
  });

  it('upserts: setting the same key twice keeps the latest value', async () => {
    const repo = newRepo();
    await repo.set('alertsEnabled', false);
    await repo.set('alertsEnabled', true);
    expect(await repo.get('alertsEnabled')).toBe(true);
  });
});
