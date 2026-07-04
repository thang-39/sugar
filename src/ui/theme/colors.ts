/**
 * Color tokens. Light theme only (PRD: dark mode out of scope for v1).
 * Blood-sugar status colors are chosen for high contrast — elderly-first,
 * accessibility pass in Session 9 will verify contrast ratios formally.
 */

const palette = {
  blue50: '#E6F4FE',
  blue100: '#C7E5FC',
  blue500: '#208AEF',
  blue600: '#1A6FBF',
  blue700: '#155A9C',
  green500: '#16A34A',
  green50: '#E7F6EC',
  amber500: '#D97706',
  amber50: '#FCF1E2',
  red500: '#DC2626',
  red50: '#FBE9E9',
  gray50: '#F5F7FA',
  gray100: '#EDF1F5',
  gray200: '#E2E8F0',
  gray400: '#9AA5B1',
  gray500: '#6B7280',
  gray900: '#1A1A1A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const colors = {
  // Brand
  primary: palette.blue500,
  primaryDark: palette.blue600,
  primaryLight: palette.blue50,
  onPrimary: palette.white,

  // Surfaces
  background: palette.white,
  surface: palette.gray50,
  card: palette.white,
  border: palette.gray200,
  divider: palette.gray100,

  // Text
  text: palette.gray900,
  textMuted: palette.gray500,
  textDisabled: palette.gray400,
  onDark: palette.white,

  // Blood-sugar status (target-range evaluation → 'in-range' | 'low' | 'high')
  inRange: palette.green500,
  inRangeBg: palette.green50,
  low: palette.amber500,
  lowBg: palette.amber50,
  high: palette.red500,
  highBg: palette.red50,

  // Feedback
  error: palette.red500,
  success: palette.green500,
} as const;

export type ColorToken = keyof typeof colors;
