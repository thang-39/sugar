import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fontFamily, fontSize, type FontFamilyToken } from '@/ui/theme';

/** Semantic text roles mapped to the Evergreen type scale. */
export type TextVariant =
  | 'display' // huge number (value input, hero)
  | 'title' // screen title (24/900)
  | 'heading' // section / card heading (20/800)
  | 'body' // default paragraph text (17/400)
  | 'bodyStrong' // emphasised body (17/700)
  | 'label' // form / list label (15/600)
  | 'caption'; // small muted meta (13/600)

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** Override the variant's default font weight. */
  weight?: FontFamilyToken;
  /** Override the variant's default color. */
  color?: string;
  children: ReactNode;
}

/**
 * Nunito-backed Text. Every user-facing string should render through this (or a
 * primitive that uses it) so the app never falls back to fontWeight — which RN
 * ignores on a custom font.
 */
export function AppText({
  variant = 'body',
  weight,
  color,
  style,
  children,
  ...rest
}: AppTextProps): ReactElement {
  const override: TextStyle = {};
  if (weight) override.fontFamily = fontFamily[weight];
  if (color) override.color = color;

  return (
    <Text style={[styles[variant], override, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: fontSize.display, fontFamily: fontFamily.black, color: colors.text },
  title: { fontSize: fontSize.xl, fontFamily: fontFamily.black, color: colors.text },
  heading: { fontSize: fontSize.lg, fontFamily: fontFamily.extrabold, color: colors.text },
  body: { fontSize: fontSize.base, fontFamily: fontFamily.regular, color: colors.text },
  bodyStrong: { fontSize: fontSize.base, fontFamily: fontFamily.bold, color: colors.text },
  label: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, color: colors.text },
  caption: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, color: colors.textMuted },
});
