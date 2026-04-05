# US-FE-14 — Trends Screen

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 27: Line chart of blood sugar readings over time
- US 28: Toggle chart time scale (7 / 30 / 90 / All days)
- US 29: Grouped by day — individual points <30 days, daily averages ≥30 days
- US 31: Tap data point → show tooltip with value and timestamp
- US 30: Both History and Trends accessible from main screen (bottom tabs)

## Goal
Build the Trends tab with a line chart. Target range shaded band is a Phase 4 feature — it is not built here (just show the chart with readings).

---

## Steps

### 1. Install Chart Dependencies

```bash
npm install react-native-gifted-charts react-native-linear-gradient react-native-svg
```

### 2. Create Chart Data Transformer

**`src/domain/useCases/ChartDataTransformer.ts`** (new file):

```ts
import { Reading } from '../models/Reading';

export type TimeScale = '7d' | '30d' | '90d' | 'all';
export type ChartPoint = { x: number; y: number; label?: string };
export type DailyAverage = { x: number; y: number };

/**
 * Get readings filtered by time scale
 */
export function filterByTimeScale(
  readings: Reading[],
  scale: TimeScale,
  now: number = Date.now()
): Reading[] {
  const MS_PER_DAY = 86400000;
  let cutoff: number;

  switch (scale) {
    case '7d':  cutoff = now - 7  * MS_PER_DAY; break;
    case '30d': cutoff = now - 30 * MS_PER_DAY; break;
    case '90d': cutoff = now - 90 * MS_PER_DAY; break;
    case 'all': return readings;
  }

  return readings.filter(r => r.recordedAt >= cutoff);
}

/**
 * Convert readings to chart data points (individual points, for <30 days)
 */
export function toIndividualPoints(readings: Reading[]): ChartPoint[] {
  return readings
    .sort((a, b) => a.recordedAt - b.recordedAt)
    .map(r => ({
      x: r.recordedAt,
      y: r.value,
      label: `${r.value} mg/dL`,
    }));
}

/**
 * Convert readings to daily average points (for ≥30 days)
 */
export function toDailyAverages(readings: Reading[]): DailyAverage[] {
  const dayMap = new Map<string, { sum: number; count: number }>();

  readings.forEach(r => {
    const dayKey = new Date(r.recordedAt).toDateString();
    const existing = dayMap.get(dayKey) ?? { sum: 0, count: 0 };
    dayMap.set(dayKey, {
      sum: existing.sum + r.value,
      count: existing.count + 1,
    });
  });

  return Array.from(dayMap.entries())
    .map(([dayKey, { sum, count }]) => ({
      x: new Date(dayKey).getTime(),
      y: Math.round(sum / count),
    }))
    .sort((a, b) => a.x - b.x);
}

/**
 * Choose the right transformer based on scale
 */
export function getChartData(
  readings: Reading[],
  scale: TimeScale
): (ChartPoint | DailyAverage)[] {
  const filtered = filterByTimeScale(readings, scale);
  if (scale === '7d' || scale === 'all') {
    return toIndividualPoints(filtered);
  }
  // For 30d and 90d, use daily averages
  return toDailyAverages(filtered);
}
```

### 3. Create Trends Screen

**`src/ui/screens/TrendsScreen.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Dimensions, Platform,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { readingRepository } from '../../data/repositories/ReadingRepository';
import { usePreferredUnit } from '../../data/stores/useAppStore';
import { Reading } from '../../domain/models/Reading';
import { TimeScale, getChartData } from '../../domain/useCases/ChartDataTransformer';
import { toDisplayValue, mgdlToMmoll } from '../../utils/unitConversion';
import { formatDate } from '../../utils/dateUtils';

const SCALES: { key: TimeScale; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'all', label: 'All' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 220;

export default function TrendsScreen() {
  const unit = usePreferredUnit();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [scale, setScale] = useState<TimeScale>('7d');
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    const all = await readingRepository.getAll();
    setReadings(all);
  }, []);

  useEffect(() => { load(); }, [load]);

  const chartData = getChartData(readings, scale);

  // Convert to display unit
  const displayData = chartData.map(pt => ({
    ...pt,
    y: unit === 'mmol/L' ? mgdlToMmoll(pt.y) : pt.y,
  }));

  const valueLabel = unit === 'mmol/L' ? 'mmol/L' : 'mg/dL';

  const handlePointPress = (item: any) => {
    setSelectedPoint({ x: item.x, y: item.y });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Trends</Text>
      </View>

      {/* Time scale picker */}
      <View style={styles.scalePicker}>
        {SCALES.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.scaleButton, scale === s.key && styles.scaleButtonActive]}
            onPress={() => setScale(s.key)}
            accessibilityLabel={`Show ${s.label}`}
          >
            <Text style={[styles.scaleText, scale === s.key && styles.scaleTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {displayData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data for this period.</Text>
            <Text style={styles.emptySubtext}>Log a reading to see your trends.</Text>
          </View>
        ) : (
          <>
            <LineChart
              data={displayData}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              spacing={displayData.length > 1 ? CHART_WIDTH / (displayData.length - 1) : CHART_WIDTH / 2}
              color="#2196F3"
              thickness={2}
              dataPointsColor="#2196F3"
              dataPointsRadius={4}
              curved
              areaChart
              startFillColor="#E3F2FD"
              endFillColor="#E3F2FD"
              startOpacity={0.4}
              endOpacity={0.1}
              yAxisTextStyle={{ fontSize: 11, color: '#757575' }}
              xAxisLabelTextStyle={{ fontSize: 11, color: '#757575' }}
              xAxisLabelFormatter={(ts: number) => formatDate(ts)}
              noOfSections={4}
              yAxisSuffix=""
              onPress={handlePointPress}
              pointerConfig={{
                pointerStripHeight: CHART_HEIGHT,
                pointerStripColor: '#BDBDBD',
                pointerColor: '#2196F3',
                radius: 5,
                pointerLabelWidth: 100,
                pointerLabelHeight: 50,
                activatePointersOnLongPress: false,
                autoAdjustPointerLabelPosition: false,
                pointerLabelComponent: (items: any) => (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipValue}>{items[0]?.y} {valueLabel}</Text>
                    <Text style={styles.tooltipDate}>{formatDate(items[0]?.x)}</Text>
                  </View>
                ),
              }}
            />
          </>
        )}
      </View>

      {/* Selected point info */}
      {selectedPoint && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            {selectedPoint.y} {valueLabel} on {formatDate(selectedPoint.x)}
          </Text>
        </View>
      )}

      {/* Note: Target range band is Phase 4 */}
      <Text style={styles.note}>Target range band will appear after configuring ranges in Settings.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#212121' },
  scalePicker: { flexDirection: 'row', padding: 16, gap: 8 },
  scaleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8 },
  scaleButtonActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  scaleText: { fontSize: 14, color: '#757575', fontWeight: '500' },
  scaleTextActive: { color: '#2196F3', fontWeight: '600' },
  chartContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyChart: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#757575', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#BDBDBD' },
  selectedInfo: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#F5F5F5', marginHorizontal: 16, borderRadius: 8, marginBottom: 16 },
  selectedInfoText: { fontSize: 14, color: '#212121', textAlign: 'center' },
  tooltip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 8, alignItems: 'center' },
  tooltipValue: { fontSize: 16, fontWeight: '700', color: '#212121' },
  tooltipDate: { fontSize: 12, color: '#757575', marginTop: 2 },
  note: { fontSize: 12, color: '#BDBDBD', textAlign: 'center', paddingHorizontal: 24, paddingBottom: 16, fontStyle: 'italic' },
});
```

### 4. Add `mgdlToMmoll` Export

In `src/utils/unitConversion.ts`, make sure `mgdlToMmoll` is exported (it was defined but not explicitly exported in the use case file — consolidate here):

```ts
export function mgdlToMmoll(mgdl: number): number {
  return Math.round(mgdl * 0.0555 * 10) / 10;
}
```

---

## Behavior Summary

| Scale | Data |
|---|---|
| 7D | Individual points |
| 30D | Daily averages |
| 90D | Daily averages |
| All | Individual points |

- Tap a point → tooltip shows exact value and date
- No target range band in Phase 1 (Phase 4)

---

## Verification

- [ ] Trends tab shows a chart after logging a reading
- [ ] Switching scales updates the chart data
- [ ] Tapping a point shows tooltip
- [ ] Chart is empty when no readings exist
- [ ] New readings appear in chart after logging

---

## Dependencies
- **US-FE-11** (can log readings) must be complete so there's data.
- **US-FE-01** (react-native-gifted-charts installed) must be complete.
