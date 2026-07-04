import { colors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export { colors, type ColorToken } from './colors';
export { spacing, radius, type SpacingToken, type RadiusToken } from './spacing';
export {
  typography,
  fontSize,
  fontWeight,
  lineHeight,
  type FontSizeToken,
} from './typography';

/** Aggregate theme object for consumers that prefer a single import. */
export const theme = {
  colors,
  spacing,
  radius,
  typography,
} as const;
