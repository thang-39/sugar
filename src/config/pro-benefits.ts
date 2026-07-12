import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The Pro value proposition shown on the paywall. Config array (money-principle
 * #3): each line is owned by the session that ships the feature —
 *   - unlimited reports + no watermark, CSV, per-meal analysis → Session 16
 *   - cloud backup & restore → Session 18
 * They are listed here so the paywall (built ahead in Session 15) renders the
 * committed offering (PRD v1.4). Do not advertise anything not in this plan.
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
  { key: 'cloudBackup', icon: 'cloud-upload' },
];
