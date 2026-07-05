/**
 * Color tokens — "Evergreen" design system (see design/Sugar App.dc.html).
 * Light theme only (PRD: dark mode out of scope for v1). Values are translated
 * from the reference design; semantic token NAMES are kept stable so consumers
 * don't break — only the values changed from the previous blue theme.
 * Blood-sugar status colors are chosen for high contrast — elderly-first;
 * accessibility pass in Session 9 will verify contrast ratios formally.
 */

const palette = {
  // Evergreen greens
  green: '#0FA36B', // primary / accent (links, toggles, in-range)
  greenDark: '#0E8F5E',
  ink: '#1B2B24', // near-black green — primary text & CTA buttons
  bg: '#F7FBF8', // app background
  surface: '#E9F5EF', // soft green surface (chips, tints)
  surfaceMuted: '#DCEDE4',
  white: '#FFFFFF',

  // Text ramp (green-tinted greys)
  textPrimary: '#1B2B24',
  textSecondary: '#5C6F66',
  textMuted: '#8A9A91',
  textFaint: '#B7C7BE',

  // Borders / dividers
  border: '#E2EDE7',
  borderStrong: '#CFE6DA',
  divider: '#F1F6F3',

  // Accent palette (cards, meal colors, warnings)
  blue: '#4E7CF6',
  purple: '#8B5CF6',
  amber: '#F5B301',
  orange: '#E8622C', // out-of-range / high

  // Status tints
  warnBg: '#FDECE4',
  amberBg: '#FCF3DE',

  black: '#000000',
} as const;

export const colors = {
  // Brand
  primary: palette.green,
  primaryDark: palette.greenDark,
  primaryLight: palette.surface,
  onPrimary: palette.white,

  // CTA button (dark "ink" pill from the design)
  primaryButton: palette.ink,
  onPrimaryButton: palette.white,

  // Surfaces
  background: palette.bg,
  surface: palette.surface,
  surfaceMuted: palette.surfaceMuted,
  card: palette.white,
  border: palette.border,
  borderStrong: palette.borderStrong,
  divider: palette.divider,

  // Text
  text: palette.textPrimary,
  textMuted: palette.textSecondary,
  textFaint: palette.textMuted,
  textDisabled: palette.textFaint,
  onDark: palette.white,

  // Accent (charts, tiles, badges)
  accentBlue: palette.blue,
  accentPurple: palette.purple,
  accentAmber: palette.amber,
  accentOrange: palette.orange,

  // Blood-sugar status (target-range evaluation → 'in-range' | 'low' | 'high')
  inRange: palette.green,
  inRangeBg: palette.surface,
  low: palette.amber,
  lowBg: palette.amberBg,
  high: palette.orange,
  highBg: palette.warnBg,
  outOfRange: palette.orange,
  warnBg: palette.warnBg,

  // Feedback
  error: palette.orange,
  success: palette.green,
} as const;

/** Per-meal accent color (avatars in history, tiles) — the 4 onboarding accents. */
export const mealColor = {
  Breakfast: palette.amber,
  Lunch: palette.blue,
  Dinner: palette.purple,
  Snack: palette.orange,
} as const;

export type ColorToken = keyof typeof colors;
