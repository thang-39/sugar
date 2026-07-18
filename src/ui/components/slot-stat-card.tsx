import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { AppText, IconTile } from '@/ui/components/ui';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Direction of the period-over-period average change (negative delta = improved). */
export type DeltaTone = 'improved' | 'worse' | 'neutral';

export interface SlotStatCardProps {
  icon: IconName;
  title: string;
  hasData: boolean;
  /** Formatted average (already in the preferred unit), e.g. "5.0". */
  averageText?: string;
  unit?: string;
  inRangeText?: string;
  countText?: string;
  /** Drives the in-range bar width and the average color threshold (>= 80% = good). */
  inRangePercent?: number;
  delta: { text: string; tone: DeltaTone; a11yLabel: string };
  labels: { average: string; inRange: string; readings: string; empty: string };
}

/**
 * One meal slot's blood-sugar summary for the Trends "By meal" view (gestational).
 * Presentational — all values/labels are injected; colors come from the active theme.
 */
export function SlotStatCard({
  icon,
  title,
  hasData,
  averageText,
  unit,
  inRangeText,
  countText,
  inRangePercent = 0,
  delta,
  labels,
}: SlotStatCardProps): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const deltaColors: Record<DeltaTone, { bg: string; fg: string }> = {
    improved: { bg: colors.surface, fg: colors.inRangeText },
    worse: { bg: colors.highBg, fg: colors.high },
    neutral: { bg: colors.divider, fg: colors.textFaint },
  };
  const deltaColor = deltaColors[delta.tone];
  const avgColor = inRangePercent >= 80 ? colors.primary : colors.high;

  return (
    <View style={[styles.card, !hasData && styles.cardEmpty]}>
      <View style={styles.header}>
        <IconTile
          icon={icon}
          size={40}
          color={colors.surface}
          iconColor={hasData ? colors.primary : colors.textFaint}
        />
        <AppText weight="extrabold" color={hasData ? colors.text : colors.textFaint} style={styles.title}>
          {title}
        </AppText>
        <View
          style={[styles.deltaPill, { backgroundColor: deltaColor.bg }]}
          accessibilityLabel={delta.a11yLabel}
        >
          <AppText variant="caption" weight="extrabold" color={deltaColor.fg}>
            {delta.text}
          </AppText>
        </View>
      </View>

      {hasData ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.avgCol}>
              <View style={styles.avgValueRow}>
                <AppText weight="extrabold" color={avgColor} style={styles.avgValue}>
                  {averageText}
                </AppText>
                <AppText variant="caption" weight="bold" color={colors.textFaint}>
                  {unit}
                </AppText>
              </View>
              <AppText variant="caption" weight="bold" color={colors.textFaint} style={styles.statLabel}>
                {labels.average}
              </AppText>
            </View>
            <View style={styles.statCol}>
              <AppText weight="extrabold" style={styles.statValue}>
                {inRangeText}
              </AppText>
              <AppText variant="caption" weight="bold" color={colors.textFaint} style={styles.statLabel}>
                {labels.inRange}
              </AppText>
            </View>
            <View style={styles.statCol}>
              <AppText weight="extrabold" style={styles.statValue}>
                {countText}
              </AppText>
              <AppText variant="caption" weight="bold" color={colors.textFaint} style={styles.statLabel}>
                {labels.readings}
              </AppText>
            </View>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${inRangePercent}%`, backgroundColor: colors.primary }]}
            />
          </View>
        </>
      ) : (
        <AppText weight="bold" color={colors.textFaint} style={styles.emptyText}>
          {labels.empty}
        </AppText>
      )}
    </View>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: spacing.lg,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    cardEmpty: {
      opacity: 0.6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: {
      flex: 1,
      fontSize: 16,
    },
    deltaPill: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      flexShrink: 0,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    avgCol: {
      flex: 1.3,
      minWidth: 0,
    },
    avgValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.xs,
    },
    avgValue: {
      fontSize: 28,
      lineHeight: 30,
    },
    statCol: {
      flex: 1,
    },
    statValue: {
      fontSize: 20,
    },
    statLabel: {
      marginTop: spacing.xs,
    },
    barTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.divider,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: radius.pill,
    },
    emptyText: {
      marginTop: spacing.md,
    },
  });
