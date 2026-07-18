import {
  isProFromCustomerInfo,
  mapPurchaseError,
  proProductFromOfferings,
} from '../revenuecat-mappers';

describe('isProFromCustomerInfo', () => {
  it('is true when the entitlement is active', () => {
    const info = { entitlements: { active: { pro: {} } } };
    expect(isProFromCustomerInfo(info, 'pro')).toBe(true);
  });

  it('is false when the entitlement is absent', () => {
    const info = { entitlements: { active: {} } };
    expect(isProFromCustomerInfo(info, 'pro')).toBe(false);
  });
});

describe('proProductFromOfferings', () => {
  it('returns the product matching the id from the current offering', () => {
    const offerings = {
      current: {
        availablePackages: [
          { product: { identifier: 'other', priceString: '1 ₫' } },
          { product: { identifier: 'sugar_pro_lifetime', priceString: '149.000 ₫' } },
        ],
      },
    };
    expect(proProductFromOfferings(offerings, 'sugar_pro_lifetime')).toEqual({
      identifier: 'sugar_pro_lifetime',
      priceString: '149.000 ₫',
    });
  });

  it('falls back to the first package when no id matches', () => {
    const offerings = {
      current: { availablePackages: [{ product: { identifier: 'x', priceString: '5 ₫' } }] },
    };
    expect(proProductFromOfferings(offerings, 'sugar_pro_lifetime')).toEqual({
      identifier: 'x',
      priceString: '5 ₫',
    });
  });

  it('returns undefined when there is no current offering', () => {
    expect(proProductFromOfferings({ current: null }, 'sugar_pro_lifetime')).toBeUndefined();
  });

  it('returns undefined when the current offering has no packages', () => {
    expect(
      proProductFromOfferings({ current: { availablePackages: [] } }, 'sugar_pro_lifetime'),
    ).toBeUndefined();
  });
});

describe('mapPurchaseError', () => {
  it('maps user cancellation to Cancelled', () => {
    expect(mapPurchaseError({ userCancelled: true, isPending: false })).toEqual({
      outcome: 'Cancelled',
      isPro: false,
    });
  });

  it('maps a pending payment to Pending', () => {
    expect(mapPurchaseError({ userCancelled: false, isPending: true })).toEqual({
      outcome: 'Pending',
      isPro: false,
    });
  });

  it('maps anything else to Error with the message', () => {
    expect(
      mapPurchaseError({ userCancelled: false, isPending: false, message: 'network' }),
    ).toEqual({ outcome: 'Error', isPro: false, errorMessage: 'network' });
  });

  it('falls back to a default message when none is provided', () => {
    expect(mapPurchaseError({ userCancelled: false, isPending: false })).toEqual({
      outcome: 'Error',
      isPro: false,
      errorMessage: 'Purchase failed',
    });
  });
});
