import type { EntitlementRepository } from '@/domain/repositories/entitlement-repository';
import type { PurchaseResult } from '@/domain/models/entitlement';
import { useEntitlementStore } from '../use-entitlement';

// Controllable fake adapter — the store is tested against the port, not RevenueCat.
const fake = {
  isProValue: false,
  purchaseResult: { outcome: 'Success', isPro: true } as PurchaseResult,
};

const mockRepo: EntitlementRepository = {
  isPro: async () => fake.isProValue,
  getProProduct: async () => ({ identifier: 'sugar_pro_lifetime', priceString: '149.000 ₫' }),
  purchasePro: async () => fake.purchaseResult,
  restore: async () => fake.isProValue,
};

// Hoisted above the imports by babel-jest; references the `mock`-prefixed repo.
jest.mock('@/data/repositories/factory', () => ({
  getEntitlementRepository: () => mockRepo,
}));

describe('useEntitlementStore', () => {
  beforeEach(() => {
    fake.isProValue = false;
    fake.purchaseResult = { outcome: 'Success', isPro: true };
    useEntitlementStore.setState({ isPro: false, proProduct: undefined, isInitialized: false });
  });

  it('refresh loads isPro and the product from the repository', async () => {
    fake.isProValue = true;

    await useEntitlementStore.getState().refresh();

    const s = useEntitlementStore.getState();
    expect(s.isPro).toBe(true);
    expect(s.proProduct?.priceString).toBe('149.000 ₫');
    expect(s.isInitialized).toBe(true);
  });

  it('purchase unlocks pro on success', async () => {
    const result = await useEntitlementStore.getState().purchase();

    expect(result.outcome).toBe('Success');
    expect(useEntitlementStore.getState().isPro).toBe(true);
  });

  it('purchase leaves isPro untouched when cancelled', async () => {
    fake.purchaseResult = { outcome: 'Cancelled', isPro: false };

    const result = await useEntitlementStore.getState().purchase();

    expect(result.outcome).toBe('Cancelled');
    expect(useEntitlementStore.getState().isPro).toBe(false);
  });

  it('restore reflects the restored entitlement', async () => {
    fake.isProValue = true;

    const restored = await useEntitlementStore.getState().restore();

    expect(restored).toBe(true);
    expect(useEntitlementStore.getState().isPro).toBe(true);
  });
});
