import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Static list for the "Vật tư đo đường huyết" screen. Name + description are i18n
 * (keyed by `key` under `screens.settings.supplies.items`); the affiliate URL is
 * config data here (like FEEDBACK_FORM_URL). Placeholders until real Shopee
 * affiliate links exist — swap the URLs; updatable later via EAS Update (JS-only).
 */
export interface SupplyItem {
  key: string;
  icon: IconName;
  url: string;
}

export const SUPPLIES: readonly SupplyItem[] = [
  { key: 'strips', icon: 'documents-outline', url: 'https://shopee.vn/placeholder-strips' },
  { key: 'lancets', icon: 'medical-outline', url: 'https://shopee.vn/placeholder-lancets' },
  { key: 'meter', icon: 'pulse-outline', url: 'https://shopee.vn/placeholder-meter' },
];
