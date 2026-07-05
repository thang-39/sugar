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
// NOTE: with the custom Nunito font, React Native ignores `fontWeight` — bold
// text must select the matching font FILE via `fontFamily` below. Keep these
// tokens only for the few native chrome styles (navigation header/tab bar) that
// don't render through the Nunito primitives.
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * Nunito font-family tokens keyed by weight. On RN a custom font's weight is
 * baked into the file name, so pick the family — not `fontWeight` — for bold text.
 * These names match the exports from `@expo-google-fonts/nunito`.
 */
export const fontFamily = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export type FontFamilyToken = keyof typeof fontFamily;

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
} as const;

export const typography = {
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
} as const;

export type FontSizeToken = keyof typeof fontSize;
