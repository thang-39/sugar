import {
  DevEntitlementRepository,
  resetDevPro,
  setDevPro,
} from '@/data/repositories/dev-entitlement-repository';
import type { AppSettings } from '@/domain/models/settings';
import type { SettingsRepository } from '@/domain/repositories/settings-repository';

/** Minimal in-memory settings store backing the support-code persistence. */
function fakeSettingsRepo(): SettingsRepository {
  const store = new Map<string, unknown>();
  return {
    async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
      return (store.has(key) ? store.get(key) : null) as AppSettings[K];
    },
    async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
      store.set(key, value);
    },
    async clear(): Promise<void> {
      store.clear();
    },
  };
}

describe('DevEntitlementRepository', () => {
  beforeEach(() => resetDevPro());

  it('starts not-pro and reports the Pro product with a price string', async () => {
    const repo = new DevEntitlementRepository();

    expect(await repo.isPro()).toBe(false);

    const product = await repo.getProProduct();
    expect(product?.identifier).toBe('sugar_pro_lifetime');
    expect(product?.priceString).toMatch(/\d/); // some price shown; never empty
  });

  it('unlocks pro after a successful purchase', async () => {
    const repo = new DevEntitlementRepository();

    const result = await repo.purchasePro();

    expect(result.outcome).toBe('Success');
    expect(result.isPro).toBe(true);
    expect(await repo.isPro()).toBe(true);
  });

  it('shares the dev flag across instances (survives repository re-creation)', async () => {
    await new DevEntitlementRepository().purchasePro();

    // Factory builds a fresh instance each call; the entitlement must persist.
    expect(await new DevEntitlementRepository().isPro()).toBe(true);
  });

  it('restore reflects the current dev entitlement', async () => {
    const repo = new DevEntitlementRepository();
    expect(await repo.restore()).toBe(false);

    setDevPro(true);
    expect(await repo.restore()).toBe(true);
  });

  it('generates a support code once and reuses the persisted value', async () => {
    const settings = fakeSettingsRepo();
    let counter = 0;
    const repo = new DevEntitlementRepository(settings, () => `id-${++counter}`);

    const first = await repo.getAppUserId();
    expect(first).toMatch(/^SGR-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // A second call (even from a fresh instance sharing the store) is stable.
    const again = await new DevEntitlementRepository(settings, () => 'id-999').getAppUserId();
    expect(again).toBe(first);
  });
});
