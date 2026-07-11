import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

import { CONDITION_PRESETS } from '@/domain/models/condition';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { type ColorScheme, colorSchemes } from './colors';

const ThemeContext = createContext<ColorScheme>(colorSchemes.evergreen);

/**
 * Provides the active color scheme, selected by the user's conditionType via
 * CONDITION_PRESETS. Re-renders (and re-themes the whole subtree) when the mode changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const conditionType = useSettingsStore((s) => s.conditionType);
  const scheme = useMemo(
    () => colorSchemes[CONDITION_PRESETS[conditionType].theme],
    [conditionType],
  );
  return <ThemeContext.Provider value={scheme}>{children}</ThemeContext.Provider>;
}

/** Active color scheme. Same shape as the static `colors` export. */
export function useTheme(): ColorScheme {
  return useContext(ThemeContext);
}
