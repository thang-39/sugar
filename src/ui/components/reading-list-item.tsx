import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Language } from '@/domain/models/settings';
import type { TargetRanges } from '@/domain/models/target-range';
import { RangeEvaluation } from '@/domain/models/target-range';
import { MealTiming } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import type { Unit } from '@/domain/models/unit';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { colors, mealColor, spacing } from '@/ui/theme';
import { formatDate, formatTime, formatValue } from '@/ui/utils/format';
import { mealIcon } from '@/ui/utils/meal-display';
import { statusColor } from '@/ui/utils/reading-display';
import { AppText, Badge, Card, IconTile } from '@/ui/components/ui';

interface ReadingListItemProps {
  reading: Reading;
  unit: Unit;
  language: Language;
  ranges: TargetRanges;
  onPress: () => void;
}

/** One history row: meal avatar, value + status, meal context, date/time. Presentational. */
export function ReadingListItem({
  reading,
  unit,
  language,
  ranges,
  onPress,
}: ReadingListItemProps): ReactElement {
  const { t } = useTranslation();
  const evaluation = evaluateReading(reading, ranges);
  const isOutOfRange = evaluation !== RangeEvaluation.InRange;
  const recordedAt = new Date(reading.recordedAt);

  const meal = t(`logForm.mealTypes.${reading.mealType}`);
  const timing = t(`logForm.mealTimings.${reading.mealTiming}`);
  const context =
    reading.mealTiming === MealTiming.After && reading.hoursAfterMeal !== undefined
      ? `${meal} · ${timing} ${t('history.hoursValue', { n: reading.hoursAfterMeal })}`
      : `${meal} · ${timing}`;

  return (
    <Card
      onPress={onPress}
      style={styles.row}
      accessibilityLabel={t('history.a11y.row', {
        value: formatValue(reading.value, unit),
        unit,
        context,
        date: formatDate(recordedAt, language),
        time: formatTime(recordedAt, language),
      })}
    >
      <IconTile icon={mealIcon[reading.mealType]} color={mealColor[reading.mealType]} />
      <View style={styles.main}>
        <View style={styles.valueRow}>
          <AppText variant="heading" color={statusColor(evaluation)}>
            {formatValue(reading.value, unit)}
          </AppText>
          <AppText variant="caption" color={colors.textFaint}>
            {unit}
          </AppText>
          {isOutOfRange && <Badge label={t(`status.${evaluation}`).toUpperCase()} />}
        </View>
        <AppText variant="caption" numberOfLines={1}>
          {context}
        </AppText>
      </View>
      <View style={styles.meta}>
        <AppText variant="caption" color={colors.text} weight="bold">
          {formatDate(recordedAt, language)}
        </AppText>
        <AppText variant="caption">{formatTime(recordedAt, language)}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  meta: {
    alignItems: 'flex-end',
  },
});
