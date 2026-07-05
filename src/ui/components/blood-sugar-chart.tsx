import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LineChart, type lineDataItem } from 'react-native-gifted-charts';

import type { ChartData } from '@/domain/models/chart';
import type { Language } from '@/domain/models/settings';
import type { TargetRanges } from '@/domain/models/target-range';
import { Unit } from '@/domain/models/unit';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { colors, fontSize, fontWeight, radius, spacing } from '@/ui/theme';
import { formatDateTime } from '@/ui/utils/format';
import { statusColor } from '@/ui/utils/reading-display';

const CHART_HEIGHT = 240;
const Y_AXIS_LABEL_WIDTH = 44;
const INITIAL_SPACING = 16;

/** Item shape we feed the chart — lineDataItem plus the extra fields our tooltip needs. */
type ChartItem = lineDataItem & { timestamp: number; count: number };

interface BloodSugarChartProps {
  data: ChartData;
  unit: Unit;
  language: Language;
  ranges: TargetRanges;
}

function toDisplay(mgdl: number, unit: Unit): number {
  return unit === Unit.MmolL ? mgdlToMmol(mgdl) : mgdl;
}

/** Round the y-axis ceiling up to a tidy multiple so section labels stay clean. */
function niceMax(rawMax: number, unit: Unit): number {
  const step = unit === Unit.MmolL ? 2 : 50;
  return Math.max(step, Math.ceil((rawMax * 1.15) / step) * step);
}

/**
 * Blood-sugar trends line chart. Values arrive in mg/dL (canonical) and are
 * converted to the preferred display unit here. The fasting/before-meal target
 * range is drawn as a shaded band with dashed edges; individual points are
 * colored by their own range evaluation, aggregated daily averages stay neutral.
 * Tapping a point reveals a tooltip with the exact value and timestamp.
 */
export function BloodSugarChart({
  data,
  unit,
  language,
  ranges,
}: BloodSugarChartProps): ReactElement {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const chart = useMemo(() => {
    const bandLow = toDisplay(ranges.fasting.low, unit);
    const bandHigh = toDisplay(ranges.fasting.high, unit);

    const items: ChartItem[] = data.points.map((p) => {
      const displayValue = toDisplay(p.value, unit);
      const color =
        p.mealTiming !== undefined
          ? statusColor(evaluateReading({ value: p.value, mealTiming: p.mealTiming }, ranges))
          : colors.primary;
      return {
        value: displayValue,
        timestamp: p.timestamp,
        count: p.count,
        dataPointColor: color,
        dataPointRadius: 5,
      };
    });

    const dataMax = items.reduce((m, it) => Math.max(m, it.value ?? 0), bandHigh);
    const maxValue = niceMax(dataMax, unit);

    // Baseline is 0 (no yAxisOffset), so value→pixel is linear: the band overlay
    // maps purely off maxValue and the fixed plot height.
    const bandTop = CHART_HEIGHT * (1 - bandHigh / maxValue);
    const bandHeight = CHART_HEIGHT * ((bandHigh - bandLow) / maxValue);

    // Space points to fill the available width when few, letting the chart scroll
    // horizontally once they get dense.
    const plotWidth = width - Y_AXIS_LABEL_WIDTH - INITIAL_SPACING - spacing.lg * 2;
    const spacingBetween =
      items.length > 1 ? Math.max(24, plotWidth / (items.length - 1)) : plotWidth;

    return { items, maxValue, bandTop, bandHeight, spacingBetween };
  }, [data.points, ranges, unit, width]);

  const renderTooltip = (items: unknown): ReactElement | null => {
    const item = Array.isArray(items) ? (items[0] as ChartItem | undefined) : undefined;
    if (!item) return null;
    const displayText = unit === Unit.MmolL ? (item.value ?? 0).toFixed(1) : String(item.value);
    return (
      <View style={styles.tooltip}>
        <Text style={styles.tooltipValue}>
          {displayText} {unit}
        </Text>
        <Text style={styles.tooltipMeta}>{formatDateTime(new Date(item.timestamp), language)}</Text>
        {item.count > 1 && (
          <Text style={styles.tooltipMeta}>{t('trends.tooltip.average', { count: item.count })}</Text>
        )}
      </View>
    );
  };

  return (
    <View>
      {data.aggregated && <Text style={styles.aggregatedNote}>{t('trends.aggregatedNote')}</Text>}

      <View
        style={styles.chartWrap}
        accessibilityLabel={t('trends.a11y.chart', { unit })}
        accessibilityRole="image"
      >
        {/* Shaded target-range band, sits behind the line (baseline-0 geometry). */}
        <View
          pointerEvents="none"
          style={[
            styles.band,
            { top: chart.bandTop, height: chart.bandHeight, left: Y_AXIS_LABEL_WIDTH },
          ]}
        />
        <LineChart
          data={chart.items}
          height={CHART_HEIGHT}
          maxValue={chart.maxValue}
          noOfSections={4}
          initialSpacing={INITIAL_SPACING}
          spacing={chart.spacingBetween}
          yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
          thickness={2}
          color={colors.primary}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={colors.divider}
          yAxisTextStyle={styles.axisText}
          curved
          pointerConfig={{
            pointerStripHeight: CHART_HEIGHT,
            pointerStripColor: colors.textMuted,
            pointerColor: colors.primaryDark,
            radius: 6,
            pointerLabelWidth: 160,
            pointerLabelHeight: 80,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: renderTooltip,
          }}
        />
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendSwatch} />
        <Text style={styles.legendText}>{t('trends.bandLabel')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aggregatedNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  chartWrap: {
    position: 'relative',
  },
  band: {
    position: 'absolute',
    right: 0,
    backgroundColor: colors.inRangeBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.inRange,
    zIndex: 0,
  },
  axisText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  tooltip: {
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tooltipValue: {
    color: colors.onDark,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  tooltipMeta: {
    color: colors.onDark,
    fontSize: fontSize.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  legendSwatch: {
    width: 24,
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.inRangeBg,
    borderWidth: 1,
    borderColor: colors.inRange,
  },
  legendText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
