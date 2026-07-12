import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Language } from '@/domain/models/settings';
import type { Reading } from '@/domain/models/reading';
import { RangeEvaluation, type TargetRanges } from '@/domain/models/target-range';
import type { Unit } from '@/domain/models/unit';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { AppText } from '@/ui/components/ui';
import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { formatTime, formatValue } from '@/ui/utils/format';
import { readingDisplay } from '@/ui/utils/reading-display';

interface ReadingCardProps {
  reading: Reading;
  unit: Unit;
  language: Language;
  ranges: TargetRanges;
  onPress: () => void;
}

function statusColor(evaluation: RangeEvaluation, colors: ColorScheme): string {
  if (evaluation === RangeEvaluation.Low) return colors.lowText;
  if (evaluation === RangeEvaluation.High) return colors.highText;
  return colors.inRangeText;
}

/** One logged reading on the Today tab, labelled by its saved before/after choice. */
export function ReadingCard({ reading, unit, language, ranges, onPress }: ReadingCardProps): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const display = readingDisplay(reading);
  const valueColor = statusColor(evaluateReading(reading, ranges), colors);
  const title = t(display.titleKey);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${formatValue(reading.value, unit)}`}
    >
      <View style={[styles.iconTile, { backgroundColor: display.iconColor }]}>
        <Ionicons name={display.icon} size={22} color={colors.onDark} />
      </View>

      <View style={styles.body}>
        <AppText weight="bold">{title}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatTime(new Date(reading.recordedAt), language)}
        </AppText>
      </View>

      <View style={styles.valueRow}>
        <AppText variant="heading" color={valueColor}>
          {formatValue(reading.value, unit)}
        </AppText>
        <AppText variant="caption" color={colors.textFaint}>
          {unit}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    iconTile: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: spacing.xs },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  });
