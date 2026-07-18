import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The Pro value proposition shown on the paywall. Config array (money-principle
 * #3): each line is owned by the session that ships the feature —
 *   - unlimited reports + no watermark, CSV, per-meal analysis → Session 16
 * They are listed here so the paywall (built ahead in Session 15) renders the
 * committed offering (PRD v1.5). Do not advertise anything not in this plan.
 *
 * NOTE (2026-07-18): cloud backup (Session 18) was cut with auth (Session 17).
 * Local JSON backup (Session 17.5) is free/never gated, so it is NOT a Pro
 * benefit. Do not re-add a `cloudBackup` line.
 */
export interface ProBenefit {
  /** i18n key under `paywall.benefits`. */
  key: string;
  icon: IconName;
}

export const PRO_BENEFITS: readonly ProBenefit[] = [
  { key: 'unlimitedReports', icon: 'document-text' },
  { key: 'noWatermark', icon: 'sparkles' },
  { key: 'csvExport', icon: 'grid' },
  { key: 'perMealAnalysis', icon: 'stats-chart' },
];
