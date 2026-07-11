import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Unit } from '@/domain/models/unit';
import type { ReadingListFilter } from '@/domain/repositories/reading-repository';
import { computeChartStats } from '@/domain/use-cases/compute-chart-stats';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';
import { transformChartData } from '@/domain/use-cases/transform-chart-data';
import { BloodSugarChart } from '@/ui/components/blood-sugar-chart';
import { StatCard } from '@/ui/components/stat-card';
import { AppText, Chip, ScreenHeader } from '@/ui/components/ui';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, radius, spacing } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;

const Scale = {
  Last7: 'last7',
  Last30: 'last30',
  Last90: 'last90',
  All: 'all',
  Custom: 'custom',
} as const;
type Scale = (typeof Scale)[keyof typeof Scale];

const SCALES: readonly Scale[] = [Scale.Last7, Scale.Last30, Scale.Last90, Scale.All, Scale.Custom];

// Fixed spans in days for the preset scales; 'all'/'custom' are derived from data.
const SCALE_DAYS: Partial<Record<Scale, number>> = {
  [Scale.Last7]: 7,
  [Scale.Last30]: 30,
  [Scale.Last90]: 90,
};

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Kept at module scope (like rangeFor) so the linter's purity rule doesn't flag
// the Date.now() call that render code isn't allowed to make directly.
function spanDaysFor(
  scale: Scale,
  readings: readonly { recordedAt: number }[],
  customFrom: Date,
  customTo: Date,
): number {
  if (scale === Scale.All) {
    const oldest = readings[readings.length - 1]?.recordedAt;
    return oldest !== undefined ? Math.ceil((Date.now() - oldest) / DAY_MS) + 1 : 0;
  }
  if (scale === Scale.Custom) {
    return Math.ceil((endOfDay(customTo) - startOfDay(customFrom)) / DAY_MS);
  }
  return SCALE_DAYS[scale] ?? 0;
}

function rangeFor(scale: Scale, customFrom: Date, customTo: Date): ReadingListFilter {
  switch (scale) {
    case Scale.Last7:
      return { from: startOfDay(new Date(Date.now() - 6 * DAY_MS)) };
    case Scale.Last30:
      return { from: startOfDay(new Date(Date.now() - 29 * DAY_MS)) };
    case Scale.Last90:
      return { from: startOfDay(new Date(Date.now() - 89 * DAY_MS)) };
    case Scale.Custom:
      return { from: startOfDay(customFrom), to: endOfDay(customTo) };
    case Scale.All:
    default:
      return {};
  }
}

export default function TrendsScreen(): ReactElement {
  const { t } = useTranslation();
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange, postMeal2hRange } =
    useSettingsStore();

  const [scale, setScale] = useState<Scale>(Scale.Last7);
  const [customFrom, setCustomFrom] = useState<Date>(() => new Date(Date.now() - 29 * DAY_MS));
  const [customTo, setCustomTo] = useState<Date>(() => new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | undefined>(undefined);

  const filter = useMemo(() => rangeFor(scale, customFrom, customTo), [scale, customFrom, customTo]);
  const { readings, isLoading, error } = useReadings(filter);

  const ranges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );

  const chartData = useMemo(() => {
    // Span drives points-vs-daily-averages. Presets are fixed; 'all' spans from
    // the oldest reading to now; 'custom' is the picked range width.
    const spanDays = spanDaysFor(scale, readings, customFrom, customTo);
    return transformChartData(readings, spanDays);
  }, [readings, scale, customFrom, customTo]);

  const stats = useMemo(
    () => computeChartStats(chartData.points, ranges),
    [chartData.points, ranges],
  );
  const avgDisplay =
    preferredUnit === Unit.MmolL
      ? mgdlToMmol(stats.averageMgdl).toFixed(1)
      : String(stats.averageMgdl);

  const onPickDate = (event: DateTimePickerEvent, selected?: Date): void => {
    const which = activePicker;
    if (Platform.OS !== 'ios') setActivePicker(undefined);
    if (!selected || which === undefined) return;
    if (which === 'from') setCustomFrom(selected);
    else setCustomTo(selected);
  };

  const renderBody = (): ReactElement => {
    if (isLoading && readings.length === 0) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (error !== undefined) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <AppText variant="heading" style={styles.centerText}>
            {t('trends.loadError')}
          </AppText>
        </View>
      );
    }
    if (chartData.points.length === 0) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="bar-chart-outline" size={56} color={colors.textDisabled} />
          <AppText variant="heading" style={styles.centerText}>
            {t('trends.empty.title')}
          </AppText>
          <AppText color={colors.textMuted} style={styles.centerText}>
            {t('trends.empty.subtitle')}
          </AppText>
        </View>
      );
    }
    return (
      <>
        <BloodSugarChart
          data={chartData}
          unit={preferredUnit}
          language={preferredLanguage}
          ranges={ranges}
        />
        <View style={styles.statsRow}>
          <StatCard value={avgDisplay} label={t('trends.stats.average')} color={colors.accentPurple} />
          <StatCard
            value={`${stats.inRangePercent}%`}
            label={t('trends.stats.inRange')}
            color={colors.accentAmber}
            onDark={false}
          />
          <StatCard
            value={String(stats.readingCount)}
            label={t('trends.stats.readings')}
            color={colors.accentBlue}
          />
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('screens.trends.title')} style={styles.header} />

        <View style={styles.filterRow}>
          {SCALES.map((s) => (
            <Chip key={s} label={t(`trends.scales.${s}`)} selected={scale === s} onPress={() => setScale(s)} />
          ))}
        </View>

        {scale === Scale.Custom && (
          <View style={styles.customRow}>
            <TouchableOpacity
              style={styles.customButton}
              onPress={() => setActivePicker('from')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${t('trends.customRange.from')}: ${formatDate(customFrom, preferredLanguage)}`}
            >
              <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
                {t('trends.customRange.from')}
              </AppText>
              <AppText weight="bold">{formatDate(customFrom, preferredLanguage)}</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.customButton}
              onPress={() => setActivePicker('to')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${t('trends.customRange.to')}: ${formatDate(customTo, preferredLanguage)}`}
            >
              <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
                {t('trends.customRange.to')}
              </AppText>
              <AppText weight="bold">{formatDate(customTo, preferredLanguage)}</AppText>
            </TouchableOpacity>
          </View>
        )}

        {renderBody()}
      </ScrollView>

      {activePicker !== undefined && (
        <DateTimePicker
          value={activePicker === 'from' ? customFrom : customTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickDate}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  header: {
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
    minHeight: 320,
  },
  centerText: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
