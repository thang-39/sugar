/**
 * Color tokens — Evergreen (default) + Rose (gestational) presets.
 * Only brand + neutral-ramp tokens differ between presets; text ramp, accents, and
 * non-brand status colors are constant. Values reconciled against design/Sugar App.dc.html
 * (EVERGREEN / ROSE objects). Light theme only (dark mode out of scope for v1).
 */
import type { ConditionTheme } from '@/domain/models/condition';

/** The tokens that vary per theme preset. */
interface Palette {
  brand: string; // primary / accent (links, toggles, in-range)
  brandDark: string;
  brandInk: string; // darker brand — status text + in-range label (WCAG-safe)
  surface: string; // soft tinted surface (chips, tints)
  surfaceMuted: string;
  bg: string; // app background
  border: string;
  borderStrong: string;
}

const evergreen: Palette = {
  brand: '#0FA36B',
  brandDark: '#0E8F5E',
  brandInk: '#0A7350',
  surface: '#E9F5EF',
  surfaceMuted: '#DCEDE4',
  bg: '#F7FBF8',
  border: '#E2EDE7',
  borderStrong: '#CFE6DA',
};

const rose: Palette = {
  brand: '#D14C87',
  brandDark: '#BC3F76',
  brandInk: '#A62C63',
  surface: '#FBE9F1',
  surfaceMuted: '#F6D9E6',
  bg: '#FDF6FA',
  border: '#F1DEE8',
  borderStrong: '#EAC9DA',
};

/** Constant, theme-independent values. */
const constant = {
  ink: '#1B2B24', // near-black — primary text & the dark CTA pill
  white: '#FFFFFF',
  textPrimary: '#1B2B24',
  textSecondary: '#5C6F66',
  textMuted: '#8A9A91',
  textFaint: '#B7C7BE',
  divider: '#F1F6F3',
  blue: '#4E7CF6',
  purple: '#8B5CF6',
  amber: '#F5B301',
  orange: '#E8622C', // out-of-range / high
  amberText: '#8A5D00',
  orangeText: '#B23C10',
  warnBg: '#FDECE4',
  amberBg: '#FCF3DE',
  black: '#000000',
} as const;

function buildColors(p: Palette) {
  return {
    // Brand
    primary: p.brand,
    primaryDark: p.brandDark,
    primaryLight: p.surface,
    onPrimary: constant.white,
    heroBadgeBg: 'rgba(255,255,255,0.25)', // semi-transparent pill behind the status badge on a colored hero

    // CTA button (dark ink pill — constant across themes)
    primaryButton: constant.ink,
    onPrimaryButton: constant.white,

    // Surfaces
    background: p.bg,
    surface: p.surface,
    surfaceMuted: p.surfaceMuted,
    card: constant.white,
    border: p.border,
    borderStrong: p.borderStrong,
    divider: constant.divider,

    // Text
    text: constant.textPrimary,
    textMuted: constant.textSecondary,
    textFaint: constant.textMuted,
    textDisabled: constant.textFaint,
    onDark: constant.white,

    // Accent (charts, tiles, badges) — constant
    accentBlue: constant.blue,
    accentPurple: constant.purple,
    accentAmber: constant.amber,
    accentOrange: constant.orange,

    // Blood-sugar status
    inRange: p.brand,
    inRangeBg: p.surface,
    low: constant.amber,
    lowBg: constant.amberBg,
    high: constant.orange,
    highBg: constant.warnBg,
    outOfRange: constant.orange,
    warnBg: constant.warnBg,

    // Status TEXT colors (contrast-safe)
    inRangeText: p.brandInk,
    lowText: constant.amberText,
    highText: constant.orangeText,

    // Feedback
    error: constant.orange,
    success: p.brand,
  } as const;
}

export type ColorScheme = ReturnType<typeof buildColors>;

/** Named schemes keyed by ConditionTheme. */
export const colorSchemes: Record<ConditionTheme, ColorScheme> = {
  evergreen: buildColors(evergreen),
  rose: buildColors(rose),
};

/** Back-compat static export (evergreen). Modules not yet on useTheme() use this. */
export const colors = colorSchemes.evergreen;

/** Per-meal accent color — constant across themes. */
export const mealColor = {
  Breakfast: constant.amber,
  Lunch: constant.blue,
  Dinner: constant.purple,
  Snack: constant.orange,
} as const;

export type ColorToken = keyof ColorScheme;
