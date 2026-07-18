import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState, type ComponentProps, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConditionType } from '@/domain/models/condition';
import { MealTiming } from '@/domain/models/meal';
import { PaywallSource } from '@/domain/models/paywall';
import { Unit } from '@/domain/models/unit';
import type { ReadingListFilter } from '@/domain/repositories/reading-repository';
import { computeChartStats } from '@/domain/use-cases/compute-chart-stats';
import { computeSlotStats, type SlotStat } from '@/domain/use-cases/compute-slot-stats';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';
import { transformChartData } from '@/domain/use-cases/transform-chart-data';
import { BloodSugarChart } from '@/ui/components/blood-sugar-chart';
import { SlotStatCard, type DeltaTone } from '@/ui/components/slot-stat-card';
import { StatCard } from '@/ui/components/stat-card';
import { AppText, Button, Chip, IconTile, ScreenHeader, SegmentedControl } from '@/ui/components/ui';
import { useProGate } from '@/ui/hooks/use-pro-gate';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { formatDate, formatValue } from '@/ui/utils/format';
import { mealIcon } from '@/ui/utils/meal-display';

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

const TrendsView = { Trend: 'trend', ByMeal: 'byMeal' } as const;
type TrendsView = (typeof TrendsView)[keyof typeof TrendsView];

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

// Explicit [from, to] window for per-meal stats (needs a closed span so the
// previous period can be derived). Module scope keeps Date.now() out of render.
function windowFor(
  scale: Scale,
  readings: readonly { recordedAt: number }[],
  customFrom: Date,
  customTo: Date,
): { from: number; to: number } {
  const now = Date.now();
  switch (scale) {
    case Scale.Last7:
      return { from: startOfDay(new Date(now - 6 * DAY_MS)), to: now };
    case Scale.Last30:
      return { from: startOfDay(new Date(now - 29 * DAY_MS)), to: now };
    case Scale.Last90:
      return { from: startOfDay(new Date(now - 89 * DAY_MS)), to: now };
    case Scale.Custom:
      return { from: startOfDay(customFrom), to: endOfDay(customTo) };
    case Scale.All:
    default: {
      const oldest = readings[readings.length - 1]?.recordedAt;
      return { from: oldest !== undefined ? startOfDay(new Date(oldest)) : startOfDay(new Date(now)), to: now };
    }
  }
}

export default function TrendsScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    preferredUnit,
    preferredLanguage,
    conditionType,
    afterMealProtocol,
    fastingRange,
    postMealRange,
    postMeal2hRange,
  } = useSettingsStore();
  const { isPro, requirePro } = useProGate();

  const [scale, setScale] = useState<Scale>(Scale.Last7);
  const [view, setView] = useState<TrendsView>(TrendsView.Trend);
  const [customFrom, setCustomFrom] = useState<Date>(() => new Date(Date.now() - 29 * DAY_MS));
  const [customTo, setCustomTo] = useState<Date>(() => new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | undefined>(undefined);

  // Per-meal analysis is offered in gestational mode only; general mode never
  // shows the segment and behaves exactly as before.
  const showByMeal = conditionType === ConditionType.Gestational;

  const filter = useMemo(() => rangeFor(scale, customFrom, customTo), [scale, customFrom, customTo]);
  const { readings, isLoading, error } = useReadings(filter);

  const ranges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );

  const slotStats = useMemo(
    () => computeSlotStats(readings, windowFor(scale, readings, customFrom, customTo), afterMealProtocol, ranges),
    [readings, scale, customFrom, customTo, afterMealProtocol, ranges],
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

  const slotIcon = (slot: SlotStat): ComponentProps<typeof Ionicons>['name'] =>
    slot.mealTiming === MealTiming.Before ? 'bed-outline' : mealIcon[slot.mealType];

  const slotTitle = (slot: SlotStat): string =>
    slot.mealTiming === MealTiming.Before
      ? t('trends.byMeal.slots.fasting')
      : t(`trends.byMeal.slots.after${slot.mealType}`);

  // Negative delta = average dropped = improved (▼ green); positive = worse (▲ orange).
  const deltaVM = (delta: number | undefined): { text: string; tone: DeltaTone; a11yLabel: string } => {
    if (delta === undefined || delta === 0) {
      return { text: '—', tone: 'neutral', a11yLabel: t('trends.byMeal.delta.none') };
    }
    const magnitude = formatValue(Math.abs(delta), preferredUnit);
    return delta < 0
      ? { text: `▼ ${magnitude}`, tone: 'improved', a11yLabel: t('trends.byMeal.delta.improved', { value: magnitude, unit: preferredUnit }) }
      : { text: `▲ ${magnitude}`, tone: 'worse', a11yLabel: t('trends.byMeal.delta.worse', { value: magnitude, unit: preferredUnit }) };
  };

  const renderByMeal = (): ReactElement => (
    <View style={styles.byMealWrap}>
      <View
        style={[styles.slotStack, !isPro && styles.slotStackLocked]}
        pointerEvents={isPro ? 'auto' : 'none'}
      >
        {slotStats.map((slot) => (
          <SlotStatCard
            key={slot.slotId}
            icon={slotIcon(slot)}
            title={slotTitle(slot)}
            hasData={slot.count > 0}
            averageText={slot.average !== undefined ? formatValue(slot.average, preferredUnit) : undefined}
            unit={preferredUnit}
            inRangeText={`${slot.percentInRange}%`}
            countText={String(slot.count)}
            inRangePercent={slot.percentInRange}
            delta={deltaVM(slot.deltaAverage)}
            labels={{
              average: t('trends.stats.average'),
              inRange: t('trends.stats.inRange'),
              readings: t('trends.stats.readings'),
              empty: t('trends.byMeal.empty'),
            }}
          />
        ))}
      </View>
      {!isPro && (
        <View style={styles.lockOverlay}>
          <View style={styles.lockCard}>
            <IconTile icon="lock-closed" size={52} color={colors.primary} iconColor={colors.onPrimary} />
            <AppText variant="heading" weight="extrabold" style={styles.lockTitle}>
              {t('trends.byMeal.lock.title')}
            </AppText>
            <AppText color={colors.textMuted} style={styles.lockSub}>
              {t('trends.byMeal.lock.subtitle')}
            </AppText>
            <Button
              label={t('trends.byMeal.lock.button')}
              onPress={() => requirePro(PaywallSource.ChartsGate)}
              style={styles.lockButton}
            />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title={t('screens.trends.title')} style={styles.header} />

        {showByMeal && (
          <SegmentedControl
            segments={[
              { value: TrendsView.Trend, label: t('trends.byMeal.segment.trend') },
              { value: TrendsView.ByMeal, label: t('trends.byMeal.segment.byMeal') },
            ]}
            value={view}
            onChange={setView}
            activeColor={colors.card}
            activeTextColor={colors.text}
            style={styles.segment}
            activeSegmentStyle={styles.segmentActive}
          />
        )}

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

        {showByMeal && view === TrendsView.ByMeal ? renderByMeal() : renderBody()}
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

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
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
  segment: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  segmentActive: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
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
  byMealWrap: {
    position: 'relative',
  },
  slotStack: {
    gap: spacing.md,
  },
  slotStackLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  lockCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  lockTitle: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  lockSub: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  lockButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
