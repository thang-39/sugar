import { PaywallSource } from '@/domain/models/paywall';
import { useProGate } from '../use-pro-gate';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

// Controlled entitlement — the gate reads Pro state through useIsPro().
let mockIsProValue = false;
jest.mock('../use-entitlement', () => ({
  useIsPro: () => mockIsProValue,
}));

describe('useProGate', () => {
  beforeEach(() => {
    mockIsProValue = false;
    mockPush.mockClear();
  });

  it('exposes isPro from the entitlement store', () => {
    mockIsProValue = true;
    expect(useProGate().isPro).toBe(true);
  });

  it('requirePro returns true and does not open the paywall when Pro', () => {
    mockIsProValue = true;

    const allowed = useProGate().requirePro(PaywallSource.CsvGate);

    expect(allowed).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('requirePro opens the paywall with the source and returns false when not Pro', () => {
    mockIsProValue = false;

    const allowed = useProGate().requirePro(PaywallSource.ReportGate);

    expect(allowed).toBe(false);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { paywallSource: PaywallSource.ReportGate },
    });
  });
});
