import { colors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export { colors, mealColor, type ColorToken } from './colors';
export { colorSchemes, type ColorScheme } from './colors';
export { ThemeProvider, useTheme } from './theme-context';
export { spacing, radius, type SpacingToken, type RadiusToken } from './spacing';
export {
  typography,
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
  type FontSizeToken,
  type FontFamilyToken,
} from './typography';

/** Aggregate theme object for consumers that prefer a single import. */
export const theme = {
  colors,
  spacing,
  radius,
  typography,
} as const;
