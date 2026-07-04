import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import vi from './vi.json';

export const SUPPORTED_LANGUAGES = ['vi', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Product default is Vietnamese (VN-first market); English is the fallback.
 * User-facing language switching lands with onboarding/settings; the persisted
 * preference will call `i18n.changeLanguage(...)` at boot in a later session.
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
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
