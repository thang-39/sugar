import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/components/ui';
import { colors, radius, spacing } from '@/ui/theme';

interface StatCardProps {
  value: string;
  label: string;
  /** Tile background — pass a theme accent token (accentPurple/accentAmber/accentBlue). */
  color: string;
  /** When false, use dark ink text (for light tiles like amber). Defaults to white text. */
  onDark?: boolean;
}

/** Colored summary tile for the Trends screen (Average / In range / Readings). */
export function StatCard({ value, label, color, onDark = true }: StatCardProps): ReactElement {
  const fg = onDark ? colors.onDark : colors.text;
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      <AppText variant="title" color={fg} style={styles.value}>
        {value}
      </AppText>
      <AppText
        variant="caption"
        weight="bold"
        color={fg}
        style={[styles.label, { opacity: onDark ? 0.85 : 0.75 }]}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  value: {
    fontSize: 22,
  },
  label: {
    fontSize: 11.5,
  },
});
