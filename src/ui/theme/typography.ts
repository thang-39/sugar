import type { TextStyle } from 'react-native';

/**
 * Typography tokens. Base body size is 17 (elderly-first, CLAUDE.md UI rules).
 * `allowFontScaling` stays on app-wide, so these are the un-scaled baselines.
 */

export const fontSize = {
  xs: 13,
  sm: 15,
  base: 17,
  lg: 20,
  xl: 24,
  xxl: 32,
  display: 44,
} as const;

// Typed as TextStyle['fontWeight'] so tokens drop straight into styles.
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const typography = {
  fontSize,
  fontWeight,
  lineHeight,
} as const;

export type FontSizeToken = keyof typeof fontSize;
