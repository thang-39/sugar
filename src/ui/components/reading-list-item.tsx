import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Language } from '@/domain/models/settings';
import type { TargetRanges } from '@/domain/models/target-range';
import { MealTiming } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import type { Unit } from '@/domain/models/unit';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { colors, fontSize, fontWeight, radius, spacing } from '@/ui/theme';
import { formatDate, formatTime, formatValue } from '@/ui/utils/format';
import { statusColor } from '@/ui/utils/reading-display';

interface ReadingListItemProps {
  reading: Reading;
  unit: Unit;
  language: Language;
  ranges: TargetRanges;
  onPress: () => void;
}

/** One history row: status color, value, meal context, date/time. Presentational. */
export function ReadingListItem({
  reading,
  unit,
  language,
  ranges,
  onPress,
}: ReadingListItemProps): ReactElement {
  const { t } = useTranslation();
  const evaluation = evaluateReading(reading, ranges);
  const accent = statusColor(evaluation);
  const recordedAt = new Date(reading.recordedAt);

  const meal = t(`logForm.mealTypes.${reading.mealType}`);
  const timing = t(`logForm.mealTimings.${reading.mealTiming}`);
  const context =
    reading.mealTiming === MealTiming.After && reading.hoursAfterMeal !== undefined
      ? `${meal} · ${timing} ${t('history.hoursValue', { n: reading.hoursAfterMeal })}`
      : `${meal} · ${timing}`;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t('history.a11y.row', {
        value: formatValue(reading.value, unit),
        unit,
        context,
        date: formatDate(recordedAt, language),
        time: formatTime(recordedAt, language),
      })}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.main}>
        <Text style={styles.value}>
          {formatValue(reading.value, unit)} <Text style={styles.unit}>{unit}</Text>
        </Text>
        <Text style={styles.context} numberOfLines={1}>
          {context}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.date}>{formatDate(recordedAt, language)}</Text>
        <Text style={styles.time}>{formatTime(recordedAt, language)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  accent: {
    width: 6,
    alignSelf: 'stretch',
    marginRight: spacing.md,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  unit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  context: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  meta: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  time: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
