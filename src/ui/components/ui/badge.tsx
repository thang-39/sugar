import type { ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';
import { AppText } from './app-text';

interface BadgeProps {
  label: string;
  /** Text color (default: out-of-range orange). */
  color?: string;
  /** Pill background (default: soft warn tint). Pass a solid color for filled badges. */
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small status pill ("OUT OF RANGE", "IN RANGE"). Presentational. */
export function Badge({
  label,
  color = colors.outOfRange,
  backgroundColor = colors.warnBg,
  style,
}: BadgeProps): ReactElement {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <AppText weight="extrabold" color={color} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  text: {
    fontSize: fontSize.xs,
    letterSpacing: 0.3,
  },
});
