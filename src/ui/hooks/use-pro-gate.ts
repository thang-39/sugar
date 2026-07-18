import { router } from 'expo-router';

import { PaywallSource } from '@/domain/models/paywall';

import { useIsPro } from './use-entitlement';

export interface ProGate {
  /** Current Pro entitlement — read straight from the single source of truth. */
  isPro: boolean;
  /**
   * One-cursor Pro gate (money-principle #2). Pro → `true`, caller proceeds.
   * Otherwise opens the paywall with `source` for contextual copy and returns
   * `false` so the caller aborts the gated action.
   */
  requirePro: (source: PaywallSource) => boolean;
}

/** Every Pro gate in the app flows through this helper — never scatter checks. */
export function useProGate(): ProGate {
  const isPro = useIsPro();

  const requirePro = (source: PaywallSource): boolean => {
    if (isPro) return true;
    router.push({ pathname: '/paywall', params: { paywallSource: source } });
    return false;
  };

  return { isPro, requirePro };
}
