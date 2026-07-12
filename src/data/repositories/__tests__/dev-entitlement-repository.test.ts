import {
  DevEntitlementRepository,
  resetDevPro,
  setDevPro,
} from '@/data/repositories/dev-entitlement-repository';

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
});
