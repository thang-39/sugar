import { getLocales } from 'expo-localization';

import { Language } from '@/domain/models/settings';

/** Just the slice of expo-localization's `Locale` this needs — keeps it testable. */
interface LocaleLike {
  languageCode: string | null;
}

/**
 * Pick the app language for someone who has never chosen one.
 *
 * Rule: a Vietnamese device gets Vietnamese, everything else gets English. The
 * app previously hard-coded Vietnamese for every user on the planet and never
 * read the device at all, so anyone installing from the English store listing
 * opened a Vietnamese app.
 *
 * Only ever a DEFAULT. Once `preferredLanguage` is persisted (onboarding or the
 * Settings toggle) that choice wins forever — see `useSettingsStore.initialize`.
 */
export function resolveDeviceLanguage(locales: LocaleLike[] = getLocales()): Language {
  return locales[0]?.languageCode === 'vi' ? Language.Vietnamese : Language.English;
}
