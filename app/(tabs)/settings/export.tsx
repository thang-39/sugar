import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { generateAndShareCsv, ShareCsvStatus } from '@/data/export/share-csv';
import { getReadingRepository } from '@/data/repositories/factory';
import { ExportRangePreset } from '@/domain/models/export';
import { MealType } from '@/domain/models/meal';
import type { ReadingListFilter } from '@/domain/repositories/reading-repository';
import { resolveExportRange } from '@/domain/use-cases/resolve-export-range';
import { AppText, Button, Card, Chip, ScreenHeader } from '@/ui/components/ui';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, radius, spacing } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESETS: readonly ExportRangePreset[] = [
  ExportRangePreset.All,
  ExportRangePreset.Last3Months,
  ExportRangePreset.Last6Months,
  ExportRangePreset.Custom,
];

export default function ExportScreen(): ReactElement {
  const { t } = useTranslation();
  const { preferredUnit, preferredLanguage } = useSettingsStore();

  const [preset, setPreset] = useState<ExportRangePreset>(ExportRangePreset.All);
  const [customFrom, setCustomFrom] = useState<Date>(() => new Date(Date.now() - 29 * DAY_MS));
  const [customTo, setCustomTo] = useState<Date>(() => new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  // Pin the bounds until a dependency changes so the "last N months" snapshot
  // and the readings query don't drift on every render.
  const filter = useMemo<ReadingListFilter>(
    () =>
      resolveExportRange(preset, {
        now: Date.now(),
        customFrom: customFrom.getTime(),
        customTo: customTo.getTime(),
      }),
    [preset, customFrom, customTo],
  );

  const { readings } = useReadings(filter);
  const count = readings.length;

  const mealLabels = useMemo<Record<MealType, string>>(
    () => ({
      [MealType.Breakfast]: t('logForm.mealTypes.Breakfast'),
      [MealType.Lunch]: t('logForm.mealTypes.Lunch'),
      [MealType.Dinner]: t('logForm.mealTypes.Dinner'),
      [MealType.Snack]: t('logForm.mealTypes.Snack'),
    }),
    [t],
  );

  const onPickDate = (_event: DateTimePickerEvent, selected?: Date): void => {
    const which = activePicker;
    if (Platform.OS !== 'ios') setActivePicker(undefined);
    if (!selected || which === undefined) return;
    if (which === 'from') setCustomFrom(selected);
    else setCustomTo(selected);
  };

  const onExport = async (): Promise<void> => {
    try {
      setIsExporting(true);
      const result = await generateAndShareCsv({
        readingRepo: getReadingRepository(),
        filter,
        unit: preferredUnit,
        mealLabels,
        now: Date.now(),
      });
      if (result.status === ShareCsvStatus.Unavailable) {
        Alert.alert(
          t('screens.settings.export.title'),
          t('screens.settings.export.shareUnavailable'),
        );
      }
    } catch {
      Alert.alert(t('common.errorTitle'), t('screens.settings.export.failed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title={t('screens.settings.export.title')} style={styles.header} />

      <AppText color={colors.textMuted} style={styles.description}>
        {t('screens.settings.export.description')}
      </AppText>

      <AppText variant="caption" weight="extrabold" color={colors.textMuted} style={styles.label}>
        {t('screens.settings.export.rangeLabel')}
      </AppText>
      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <Chip
            key={p}
            label={t(`screens.settings.export.ranges.${p}`)}
            selected={preset === p}
            onPress={() => setPreset(p)}
          />
        ))}
      </View>

      {preset === ExportRangePreset.Custom && (
        <View style={styles.customRow}>
          <TouchableOpacity
            style={styles.customButton}
            onPress={() => setActivePicker('from')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('screens.settings.export.from')}: ${formatDate(customFrom, preferredLanguage)}`}
          >
            <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
              {t('screens.settings.export.from')}
            </AppText>
            <AppText weight="bold">{formatDate(customFrom, preferredLanguage)}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.customButton}
            onPress={() => setActivePicker('to')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('screens.settings.export.to')}: ${formatDate(customTo, preferredLanguage)}`}
          >
            <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
              {t('screens.settings.export.to')}
            </AppText>
            <AppText weight="bold">{formatDate(customTo, preferredLanguage)}</AppText>
          </TouchableOpacity>
        </View>
      )}

      <Card style={styles.summaryCard}>
        <AppText color={count === 0 ? colors.textMuted : colors.text}>
          {count === 0
            ? t('screens.settings.export.empty')
            : t('screens.settings.export.summary', { n: count })}
        </AppText>
      </Card>

      <Button
        label={t('screens.settings.export.exportButton')}
        icon="share-outline"
        onPress={() => void onExport()}
        isLoading={isExporting}
        disabled={count === 0}
        style={styles.exportButton}
      />

      {activePicker !== undefined && (
        <DateTimePicker
          value={activePicker === 'from' ? customFrom : customTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickDate}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  label: {
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryCard: {
    marginTop: spacing.md,
  },
  exportButton: {
    marginTop: spacing.lg,
  },
});
