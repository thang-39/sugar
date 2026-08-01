import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import vi from './vi.json';
import { resolveDeviceLanguage } from './device-language';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Fallback when nothing else is known. The language actually shown is decided by
 * `resolveDeviceLanguage()` on a fresh install, then by the user's persisted
 * `preferredLanguage` (applied via `i18n.changeLanguage` in `useSettingsStore`).
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'vi';

export const resources = {
  vi: { translation: vi },
  en: { translation: en },
} as const;

// `.use()` is a method on the default i18next instance, not the named `use` export.
// eslint-disable-next-line import/no-named-as-default-member
void i18n.use(initReactI18next).init({
  resources,
  // The first frame renders before settings load, so start from the device
  // rather than flashing Vietnamese at an English user.
  lng: resolveDeviceLanguage(),
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
