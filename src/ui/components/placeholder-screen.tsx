import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '@/ui/theme';

interface PlaceholderScreenProps {
  title: string;
  subtitle?: string;
}

/**
 * Centered title + optional subtitle. Temporary stand-in for screens that get
 * their real implementation in later PLAN.md sessions.
 */
export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps): ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
