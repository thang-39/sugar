import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { generateAndShareCsv, ShareCsvStatus } from '@/data/export/share-csv';
import { getReadingRepository } from '@/data/repositories/factory';
import { generateAndSharePdf, SharePdfStatus } from '@/data/report/share-pdf';
import { ConditionType } from '@/domain/models/condition';
import { ExportRangePreset } from '@/domain/models/export';
import { MealType } from '@/domain/models/meal';
import type { ReadingListFilter } from '@/domain/repositories/reading-repository';
import type { TargetRanges } from '@/domain/models/target-range';
import { buildReport } from '@/domain/use-cases/build-report';
import { pregnancyWeek } from '@/domain/use-cases/pregnancy-week';
import { resolveExportRange } from '@/domain/use-cases/resolve-export-range';
import { AppText, Button, Card, Chip, ScreenHeader } from '@/ui/components/ui';
import { ReportPreviewTable } from '@/ui/components/report-preview-table';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { radius, spacing, useTheme } from '@/ui/theme';
import { formatDate, formatValue } from '@/ui/utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;

const PRESETS: readonly ExportRangePreset[] = [
  ExportRangePreset.Last14Days,
  ExportRangePreset.Last30Days,
  ExportRangePreset.Custom,
];

export default function ReportScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const {
    preferredUnit,
    preferredLanguage,
    conditionType,
    dueDate,
    afterMealProtocol,
    fastingRange,
    postMealRange,
    postMeal2hRange,
    reportCount,
    updateSetting,
  } = useSettingsStore();

  const [preset, setPreset] = useState<ExportRangePreset>(ExportRangePreset.Last14Days);
  const [customFrom, setCustomFrom] = useState<Date>(() => new Date(Date.now() - 13 * DAY_MS));
  const [customTo, setCustomTo] = useState<Date>(() => new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | undefined>(undefined);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [isSharingCsv, setIsSharingCsv] = useState(false);

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

  const ranges: TargetRanges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );

  const mealLabels = useMemo<Record<MealType, string>>(
    () => ({
      [MealType.Breakfast]: t('logForm.mealTypes.Breakfast'),
      [MealType.Lunch]: t('logForm.mealTypes.Lunch'),
      [MealType.Dinner]: t('logForm.mealTypes.Dinner'),
      [MealType.Snack]: t('logForm.mealTypes.Snack'),
    }),
    [t],
  );

  const formatVal = useMemo(() => (mgdl: number) => formatValue(mgdl, preferredUnit), [preferredUnit]);
  const formatDay = useMemo(
    () => (ts: number) => {
      const d = new Date(ts);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    },
    [],
  );

  const labels = useMemo(
    () => ({
      date: t('screens.settings.report.columns.date'),
      breakfast: t('screens.settings.report.columns.breakfast'),
      lunch: t('screens.settings.report.columns.lunch'),
      dinner: t('screens.settings.report.columns.dinner'),
      before: t('screens.settings.report.columns.before'),
      after: t('screens.settings.report.columns.after'),
      hour1: t('screens.settings.report.columns.hour1'),
      hour2: t('screens.settings.report.columns.hour2'),
    }),
    [t],
  );

  // Readings arrive newest-first; the report reads chronologically.
  const model = useMemo(
    () =>
      buildReport(readings.slice().reverse(), {
        unit: preferredUnit,
        ranges,
        protocol: afterMealProtocol,
        formatValue: formatVal,
        formatDay,
      }),
    [readings, preferredUnit, ranges, afterMealProtocol, formatVal, formatDay],
  );

  const rangeStr = (r: { low: number; high: number }): string =>
    `${formatValue(r.low, preferredUnit)}–${formatValue(r.high, preferredUnit)}`;

  const subhead = useMemo(() => {
    const isGdm = conditionType === ConditionType.Gestational && dueDate !== null;
    const params = {
      fasting: rangeStr(fastingRange),
      postMeal: rangeStr(postMealRange),
      unit: preferredUnit,
    };
    if (isGdm && dueDate !== null) {
      return t('screens.settings.report.subheadGdm', {
        ...params,
        week: pregnancyWeek(dueDate, Date.now()),
      });
    }
    return t('screens.settings.report.subheadGeneral', params);
  }, [conditionType, dueDate, fastingRange, postMealRange, preferredUnit, t]);

  const onPickDate = (_event: DateTimePickerEvent, selected?: Date): void => {
    const which = activePicker;
    if (Platform.OS !== 'ios') setActivePicker(undefined);
    if (!selected || which === undefined) return;
    if (which === 'from') setCustomFrom(selected);
    else setCustomTo(selected);
  };

  const onSharePdf = async (): Promise<void> => {
    try {
      setIsSharingPdf(true);
      const result = await generateAndSharePdf({
        readingRepo: getReadingRepository(),
        filter,
        unit: preferredUnit,
        ranges,
        protocol: afterMealProtocol,
        formatValue: formatVal,
        formatDay,
        html: {
          title: t('screens.settings.report.docTitle'),
          subhead,
          labels,
          watermark: t('screens.settings.report.watermark'),
          statsText: (percent, total) =>
            t('screens.settings.report.stats', { percent, count: total }),
        },
      });
      if (result.status === SharePdfStatus.Shared) {
        void updateSetting('reportCount', reportCount + 1);
      } else if (result.status === SharePdfStatus.Unavailable) {
        Alert.alert(t('screens.settings.report.title'), t('screens.settings.report.shareUnavailable'));
      }
    } catch {
      Alert.alert(t('common.errorTitle'), t('screens.settings.report.failed'));
    } finally {
      setIsSharingPdf(false);
    }
  };

  const onExportCsv = async (): Promise<void> => {
    try {
      setIsSharingCsv(true);
      const result = await generateAndShareCsv({
        readingRepo: getReadingRepository(),
        filter,
        unit: preferredUnit,
        mealLabels,
        now: Date.now(),
      });
      if (result.status === ShareCsvStatus.Unavailable) {
        Alert.alert(t('screens.settings.report.title'), t('screens.settings.report.shareUnavailable'));
      }
    } catch {
      Alert.alert(t('common.errorTitle'), t('screens.settings.report.failed'));
    } finally {
      setIsSharingCsv(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader title={t('screens.settings.report.title')} style={styles.header} />

      <AppText color={colors.textMuted} style={styles.description}>
        {t('screens.settings.report.description')}
      </AppText>

      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <Chip
            key={p}
            label={t(`screens.settings.report.ranges.${p}`)}
            selected={preset === p}
            onPress={() => setPreset(p)}
          />
        ))}
      </View>

      {preset === ExportRangePreset.Custom && (
        <View style={styles.customRow}>
          <TouchableOpacity
            style={[styles.customButton, { backgroundColor: colors.surface }]}
            onPress={() => setActivePicker('from')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('screens.settings.report.from')}: ${formatDate(customFrom, preferredLanguage)}`}
          >
            <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
              {t('screens.settings.report.from')}
            </AppText>
            <AppText weight="bold">{formatDate(customFrom, preferredLanguage)}</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.customButton, { backgroundColor: colors.surface }]}
            onPress={() => setActivePicker('to')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('screens.settings.report.to')}: ${formatDate(customTo, preferredLanguage)}`}
          >
            <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
              {t('screens.settings.report.to')}
            </AppText>
            <AppText weight="bold">{formatDate(customTo, preferredLanguage)}</AppText>
          </TouchableOpacity>
        </View>
      )}

      {count === 0 ? (
        <Card style={styles.summaryCard}>
          <AppText color={colors.textMuted}>{t('screens.settings.report.empty')}</AppText>
        </Card>
      ) : (
        <Card style={styles.previewCard}>
          <AppText weight="extrabold" style={styles.previewTitle}>
            {t('screens.settings.report.docTitle')}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.previewSubhead}>
            {subhead}
          </AppText>
          <ReportPreviewTable model={model} labels={labels} />
          <AppText variant="caption" weight="bold" color={colors.textMuted} style={styles.statsText}>
            {t('screens.settings.report.stats', {
              percent: model.stats.percentInRange,
              count: model.stats.total,
            })}
          </AppText>
        </Card>
      )}

      <View style={styles.buttonRow}>
        <Button
          label={t('screens.settings.report.sharePdf')}
          icon="document-text-outline"
          onPress={() => void onSharePdf()}
          isLoading={isSharingPdf}
          disabled={count === 0 || isSharingCsv}
          style={styles.pdfButton}
        />
        <Button
          label={t('screens.settings.report.exportCsv')}
          variant="ghost"
          onPress={() => void onExportCsv()}
          isLoading={isSharingCsv}
          disabled={count === 0 || isSharingPdf}
          style={styles.csvButton}
        />
      </View>

      <AppText variant="caption" color={colors.textFaint} style={styles.watermarkNote}>
        {t('screens.settings.report.watermarkNote')}
      </AppText>

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
  content: { padding: spacing.lg, gap: spacing.sm },
  header: { marginBottom: spacing.xs },
  description: { marginBottom: spacing.md, lineHeight: 22 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  customRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  customButton: { flex: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  summaryCard: { marginTop: spacing.md },
  previewCard: { marginTop: spacing.md, gap: spacing.xs },
  previewTitle: { textAlign: 'center' },
  previewSubhead: { textAlign: 'center', marginBottom: spacing.sm },
  statsText: { textAlign: 'center', marginTop: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  pdfButton: { flex: 1.4 },
  csvButton: { flex: 1 },
  watermarkNote: { textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
