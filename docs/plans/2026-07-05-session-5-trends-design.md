# Session 5 — Apply Evergreen Design to Trends Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the already-built Trends screen (Session 5) onto the Evergreen design system + shared primitives, and add the 3 summary stat cards (Average / In range / Readings) shown in `design/Sugar App.dc.html`.

**Architecture:** UI-only change. The domain/data layers are untouched except for one new pure use case (`computeChartStats`) that summarizes the displayed points — business logic stays out of the components. The chart keeps `react-native-gifted-charts` (tech-stack mandate); we only restyle it (Card wrapper, 2-item legend, axis-date labels) and swap raw `Text`/`fontWeight` for `AppText`/`fontFamily`. All colors/spacing/radius come from `src/ui/theme`; all strings via i18n.

**Tech Stack:** Expo Router, TypeScript strict, react-native-gifted-charts, i18next, Jest.

**Design reference:** `design/Sugar App.dc.html` — Trends tab block (lines 189–226) + chart JS (lines 591–781). Never guess token values; reconcile against this file.

---

## What already exists (do not rebuild)

- `app/(tabs)/trends.tsx` — scale chips (7d/30d/90d/All/Custom), custom-range date pickers, loading/error/empty states, calls `transformChartData`. Currently uses inline `StyleSheet`, `fontWeight`, raw `Text` — **the thing being retrofitted.**
- `src/ui/components/blood-sugar-chart.tsx` — LineChart with shaded band + tooltip + 1-item legend. Same styling debt.
- `src/domain/use-cases/transform-chart-data.ts` — points-vs-daily-averages grouping. **Unchanged.**
- `src/domain/use-cases/evaluate-reading.ts` — `evaluateReading(reading, ranges) → RangeEvaluation`. Reused by the new stats use case.
- Primitives in `src/ui/components/ui/`: `AppText`, `Chip` (has `selected`, `activeColor`, `label`, `onPress`), `Card` (white surface + Evergreen shadow), `ScreenHeader` (title + optional right slot).

## File structure

| File | Responsibility | Action |
|---|---|---|
| `src/domain/use-cases/compute-chart-stats.ts` | Pure summary of plotted points → `{ averageMgdl, inRangePercent, readingCount }` | Create |
| `src/domain/use-cases/__tests__/compute-chart-stats.test.ts` | Black-box tests for the above | Create |
| `src/ui/components/stat-card.tsx` | `StatCard` composite — colored tile (value + label) | Create |
| `src/i18n/vi.json`, `src/i18n/en.json` | `trends.stats.*`, `trends.legend.*` keys | Modify |
| `src/ui/components/blood-sugar-chart.tsx` | Card wrapper, 2-item legend, axis-date labels, AppText | Modify |
| `app/(tabs)/trends.tsx` | ScreenHeader, Chip scales, stat-cards row, AppText | Modify |
| `app/(tabs)/_layout.tsx` | `headerShown: false` for the trends tab | Modify |

---

## Task 1: Domain — `computeChartStats` use case (TDD)

**Files:**
- Create: `src/domain/use-cases/compute-chart-stats.ts`
- Test: `src/domain/use-cases/__tests__/compute-chart-stats.test.ts`

Rationale for the in-range rule: individual points carry `mealTiming`, so they evaluate through `evaluateReading` (Before→fasting, After→post-meal). Aggregated daily-average points have no `mealTiming`; mirroring the design's chart JS they count as in-range when inside the **union** band `[min(fasting.low, postMeal.low), max(fasting.high, postMeal.high)]`. `inRangePercent` is share of *plotted points* (each point weighs equally, matching the mockup's per-point coloring), while `readingCount` sums `point.count` so daily-average days report the true number of readings.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/use-cases/__tests__/compute-chart-stats.test.ts
import { computeChartStats } from '@/domain/use-cases/compute-chart-stats';
import type { ChartPoint } from '@/domain/models/chart';
import { MealTiming } from '@/domain/models/meal';
import type { TargetRanges } from '@/domain/models/target-range';

const ranges: TargetRanges = {
  fasting: { low: 70, high: 100 },
  postMeal: { low: 70, high: 140 },
};

const point = (value: number, extra: Partial<ChartPoint> = {}): ChartPoint => ({
  value,
  timestamp: 0,
  count: 1,
  ...extra,
});

describe('computeChartStats', () => {
  it('returns zeros for no points', () => {
    expect(computeChartStats([], ranges)).toEqual({
      averageMgdl: 0,
      inRangePercent: 0,
      readingCount: 0,
    });
  });

  it('averages values rounded to the nearest integer (mg/dL)', () => {
    const stats = computeChartStats([point(90), point(101)], ranges); // mean 95.5 → 96
    expect(stats.averageMgdl).toBe(96);
  });

  it('evaluates individual points by their meal timing for in-range %', () => {
    // 110 is HIGH for fasting/Before but IN-RANGE for post-meal/After.
    const stats = computeChartStats(
      [
        point(110, { mealTiming: MealTiming.Before }), // high → out
        point(110, { mealTiming: MealTiming.After }), // in range
      ],
      ranges,
    );
    expect(stats.inRangePercent).toBe(50);
  });

  it('uses the union band for aggregated points with no meal timing', () => {
    // No mealTiming → union band [70,140]; 130 is in, 160 is out.
    const stats = computeChartStats([point(130), point(160)], ranges);
    expect(stats.inRangePercent).toBe(50);
  });

  it('sums point counts for the reading total', () => {
    const stats = computeChartStats(
      [point(90, { count: 3 }), point(95, { count: 2 })],
      ranges,
    );
    expect(stats.readingCount).toBe(5);
  });

  it('rounds the percentage', () => {
    // 2 of 3 in range → 66.67 → 67
    const stats = computeChartStats([point(90), point(90), point(200)], ranges);
    expect(stats.inRangePercent).toBe(67);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- compute-chart-stats`
Expected: FAIL — `Cannot find module '@/domain/use-cases/compute-chart-stats'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/domain/use-cases/compute-chart-stats.ts
import type { ChartPoint } from '../models/chart';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';
import { evaluateReading } from './evaluate-reading';

/** Summary tiles shown above/below the trends chart. Values stay in mg/dL; the UI converts + formats. */
export interface ChartStats {
  averageMgdl: number; // mean of plotted values, rounded to nearest integer
  inRangePercent: number; // 0–100, share of plotted points inside target
  readingCount: number; // total readings represented (sums daily-average buckets)
}

function isPointInRange(point: ChartPoint, ranges: TargetRanges): boolean {
  if (point.mealTiming !== undefined) {
    return (
      evaluateReading({ value: point.value, mealTiming: point.mealTiming }, ranges) ===
      RangeEvaluation.InRange
    );
  }
  // Aggregated daily average: no timing → union of both bands (matches the design's chart JS).
  const low = Math.min(ranges.fasting.low, ranges.postMeal.low);
  const high = Math.max(ranges.fasting.high, ranges.postMeal.high);
  return point.value >= low && point.value <= high;
}

export function computeChartStats(
  points: readonly ChartPoint[],
  ranges: TargetRanges,
): ChartStats {
  if (points.length === 0) {
    return { averageMgdl: 0, inRangePercent: 0, readingCount: 0 };
  }
  const sum = points.reduce((acc, p) => acc + p.value, 0);
  const inRange = points.filter((p) => isPointInRange(p, ranges)).length;
  const readingCount = points.reduce((acc, p) => acc + p.count, 0);
  return {
    averageMgdl: Math.round(sum / points.length),
    inRangePercent: Math.round((inRange / points.length) * 100),
    readingCount,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- compute-chart-stats`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/use-cases/compute-chart-stats.ts src/domain/use-cases/__tests__/compute-chart-stats.test.ts
git commit -m "feat: computeChartStats use case for trends summary tiles"
```

---

## Task 2: i18n keys

**Files:**
- Modify: `src/i18n/vi.json` (inside the existing `"trends"` block)
- Modify: `src/i18n/en.json` (inside the existing `"trends"` block)

- [ ] **Step 1: Add keys to the `trends` block in `vi.json`**

Add these siblings next to `"bandLabel"` (keep valid JSON — mind the commas):

```json
    "legend": {
      "inRange": "Trong ngưỡng",
      "outOfRange": "Ngoài ngưỡng"
    },
    "stats": {
      "average": "Trung bình",
      "inRange": "Đạt ngưỡng",
      "readings": "Số lần đo"
    },
```

- [ ] **Step 2: Add the same keys to `en.json`**

```json
    "legend": {
      "inRange": "In range",
      "outOfRange": "Out of range"
    },
    "stats": {
      "average": "Average",
      "inRange": "In range",
      "readings": "Readings"
    },
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./src/i18n/vi.json'); require('./src/i18n/en.json'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add src/i18n/vi.json src/i18n/en.json
git commit -m "feat: i18n keys for trends legend and stat tiles"
```

---

## Task 3: `StatCard` composite

**Files:**
- Create: `src/ui/components/stat-card.tsx`

Design (mockup lines 221–225): colored rounded tile, big value (900 weight ~22px), small label (700 weight ~11.5px, reduced opacity). Purple + blue tiles use white text; the amber tile uses ink text.

- [ ] **Step 1: Create the component**

```tsx
// src/ui/components/stat-card.tsx
import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/ui/components/ui';
import { colors, radius, spacing } from '@/ui/theme';

interface StatCardProps {
  value: string;
  label: string;
  /** Tile background — pass a theme accent token (accentPurple/accentAmber/accentBlue). */
  color: string;
  /** When false, use dark ink text (for light tiles like amber). Defaults to white text. */
  onDark?: boolean;
}

/** Colored summary tile for the Trends screen (Average / In range / Readings). */
export function StatCard({ value, label, color, onDark = true }: StatCardProps): ReactElement {
  const fg = onDark ? colors.onDark : colors.text;
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      <AppText variant="title" color={fg} style={styles.value}>
        {value}
      </AppText>
      <AppText variant="caption" weight="bold" color={fg} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  value: {
    fontSize: 22,
  },
  label: {
    opacity: 0.85,
  },
});
```

> If `radius.md` renders tighter than the mockup's 16px, reconcile against `src/ui/theme/spacing.ts` (`radius`) rather than hardcoding — pick the closest existing token or add one there.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/stat-card.tsx
git commit -m "feat: StatCard composite for trends summary tiles"
```

---

## Task 4: Retrofit `BloodSugarChart`

**Files:**
- Modify: `src/ui/components/blood-sugar-chart.tsx`

Changes: (a) wrap the plotted area in `Card`; (b) legend gets a second item — "Out of range" (orange dot); (c) add axis start/end date labels below the chart; (d) replace `Text`/`fontWeight` with `AppText`. Keep the LineChart + band geometry as-is.

- [ ] **Step 1: Update imports**

Replace the RN `Text` import usage and theme import. At the top, add:

```tsx
import { AppText, Card } from '@/ui/components/ui';
import { formatDate } from '@/ui/utils/format';
```

Remove `Text` from the `react-native` import (keep `StyleSheet`, `useWindowDimensions`, `View`) and drop `fontWeight` from the theme import if no longer referenced.

- [ ] **Step 2: Wrap the chart in a Card and add axis-date labels**

Replace the `chartWrap` `View` (the block containing the band + `LineChart`) so it sits inside a `Card`, and add a date row after it. The `data.points` array is oldest→newest, so first/last timestamps are the axis ends:

```tsx
<Card style={styles.chartCard}>
  <View
    style={styles.chartWrap}
    accessibilityLabel={t('trends.a11y.chart', { unit })}
    accessibilityRole="image"
  >
    <View
      pointerEvents="none"
      style={[styles.band, { top: chart.bandTop, height: chart.bandHeight, left: Y_AXIS_LABEL_WIDTH }]}
    />
    <LineChart
      /* ...unchanged props... */
    />
  </View>

  <View style={styles.axisRow}>
    <AppText variant="caption" color={colors.textFaint}>
      {formatDate(new Date(data.points[0]?.timestamp ?? 0), language)}
    </AppText>
    <AppText variant="caption" color={colors.textFaint}>
      {formatDate(new Date(data.points[data.points.length - 1]?.timestamp ?? 0), language)}
    </AppText>
  </View>
</Card>
```

- [ ] **Step 3: Replace the aggregated-note and legend with AppText + a second legend item**

```tsx
{data.aggregated && (
  <AppText variant="caption" color={colors.textMuted} style={styles.aggregatedNote}>
    {t('trends.aggregatedNote')}
  </AppText>
)}
```

Legend (after the Card):

```tsx
<View style={styles.legendRow}>
  <View style={styles.legendItem}>
    <View style={styles.bandSwatch} />
    <AppText variant="caption" color={colors.textMuted}>
      {t('trends.legend.inRange')}
    </AppText>
  </View>
  <View style={styles.legendItem}>
    <View style={styles.dotSwatch} />
    <AppText variant="caption" color={colors.textMuted}>
      {t('trends.legend.outOfRange')}
    </AppText>
  </View>
</View>
```

- [ ] **Step 4: Update the StyleSheet**

Remove `aggregatedNote`'s `fontWeight`, `tooltipValue.fontWeight`, `legendText`, and the old single `legendSwatch`/`legendRow`. Add:

```tsx
chartCard: {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
},
axisRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: spacing.sm,
  paddingLeft: Y_AXIS_LABEL_WIDTH,
  marginTop: spacing.xs,
},
legendRow: {
  flexDirection: 'row',
  gap: spacing.lg,
  marginTop: spacing.md,
},
legendItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
},
bandSwatch: {
  width: 14,
  height: 14,
  borderRadius: radius.sm,
  backgroundColor: colors.inRangeBg,
  borderWidth: 1,
  borderColor: colors.borderStrong,
},
dotSwatch: {
  width: 12,
  height: 12,
  borderRadius: radius.pill,
  backgroundColor: colors.outOfRange,
},
```

For the tooltip, keep the dark background (already `colors.text` = ink `#1B2B24`, matching the mockup's `#1B2B24`); convert its `Text` nodes to `AppText` with `color={colors.onDark}` and drop the manual `fontWeight` (use `weight="extrabold"` on the value line).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/blood-sugar-chart.tsx
git commit -m "feat: card-wrap trends chart, add out-of-range legend + axis dates"
```

---

## Task 5: Retrofit `TrendsScreen` + tab header

**Files:**
- Modify: `app/(tabs)/trends.tsx`
- Modify: `app/(tabs)/_layout.tsx`

Changes: (a) hide the native header for the trends tab and render a `ScreenHeader` in-screen (matches Log/History/Settings and the mockup's 24px title); (b) replace the inline chip row with `Chip` primitives; (c) replace raw `Text`/`fontWeight` custom-range buttons with `AppText`; (d) add the 3-tile `StatCard` row when data is present.

- [ ] **Step 1: Hide the native header for trends**

In `app/(tabs)/_layout.tsx`, add `headerShown: false` to the trends `Tabs.Screen` options (siblings already have it):

```tsx
<Tabs.Screen
  name="trends"
  options={{
    title: t('tabs.trends'),
    headerShown: false,
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="stats-chart-outline" color={color} size={size} />
    ),
  }}
/>
```

- [ ] **Step 2: Swap imports in `trends.tsx`**

```tsx
import { AppText, Chip, ScreenHeader } from '@/ui/components/ui';
import { StatCard } from '@/ui/components/stat-card';
import { computeChartStats } from '@/domain/use-cases/compute-chart-stats';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';
import { Unit } from '@/domain/models/unit';
```

Drop `Text` and `TouchableOpacity` from the `react-native` import (Chip/ScreenHeader/AppText replace them) and remove `fontWeight` from the theme import. Change the SafeAreaView `edges` to include `'top'` (`['top', 'left', 'right', 'bottom']`) since the native header is gone.

- [ ] **Step 3: Add the ScreenHeader and Chip-based scale row**

Replace the `filterRow` `View`/`TouchableOpacity` block:

```tsx
<ScreenHeader title={t('trends.title')} style={styles.header} />

<View style={styles.filterRow}>
  {SCALES.map((s) => (
    <Chip
      key={s}
      label={t(`trends.scales.${s}`)}
      selected={scale === s}
      onPress={() => setScale(s)}
    />
  ))}
</View>
```

- [ ] **Step 4: Convert the custom-range buttons to AppText**

Keep the `TouchableOpacity`? No — use plain `Pressable`/`TouchableOpacity` is fine for the tappable date field, but replace the inner `Text` with `AppText`:

```tsx
<TouchableOpacity
  style={styles.customButton}
  onPress={() => setActivePicker('from')}
  activeOpacity={0.7}
  accessibilityRole="button"
  accessibilityLabel={`${t('trends.customRange.from')}: ${formatDate(customFrom, preferredLanguage)}`}
>
  <AppText variant="caption" weight="semibold" color={colors.textMuted}>
    {t('trends.customRange.from')}
  </AppText>
  <AppText>{formatDate(customFrom, preferredLanguage)}</AppText>
</TouchableOpacity>
```

Apply the same to the `to` button. (Re-add `TouchableOpacity` to the `react-native` import — it is still used here.)

- [ ] **Step 5: Compute stats and render the StatCard row**

In the component body, after `chartData`:

```tsx
const stats = useMemo(() => computeChartStats(chartData.points, ranges), [chartData.points, ranges]);

const avgDisplay =
  preferredUnit === Unit.MmolL
    ? mgdlToMmol(stats.averageMgdl).toFixed(1)
    : String(stats.averageMgdl);
```

In `renderBody`, in the success branch (after `<BloodSugarChart .../>`), wrap in a fragment and add the row:

```tsx
return (
  <>
    <BloodSugarChart data={chartData} unit={preferredUnit} language={preferredLanguage} ranges={ranges} />
    <View style={styles.statsRow}>
      <StatCard value={avgDisplay} label={t('trends.stats.average')} color={colors.accentPurple} />
      <StatCard value={`${stats.inRangePercent}%`} label={t('trends.stats.inRange')} color={colors.accentAmber} onDark={false} />
      <StatCard value={String(stats.readingCount)} label={t('trends.stats.readings')} color={colors.accentBlue} />
    </View>
  </>
);
```

- [ ] **Step 6: Update the StyleSheet**

Remove `filterChip*`, `filterChipText*`, `customLabel`, `customValue`, `emptyTitle`/`emptySubtitle` `fontWeight` usages (empty-state text can move to `AppText` too — convert those `Text` nodes to `AppText variant="subtitle"`/`"caption"`). Add:

```tsx
header: {
  marginBottom: spacing.md,
},
statsRow: {
  flexDirection: 'row',
  gap: spacing.sm,
  marginTop: spacing.lg,
},
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "app/(tabs)/trends.tsx" "app/(tabs)/_layout.tsx"
git commit -m "feat: retrofit trends screen onto design system + stat cards"
```

---

## Task 6: Full verification

- [ ] **Step 1: Type-check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc clean; all tests pass (including the 6 new `computeChartStats` tests).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke (Definition of Done #3)**

Run: `npx expo start`. On the Trends tab, verify against `design/Sugar App.dc.html`:
- In-screen "Biểu đồ xu hướng" title (no duplicate native header).
- Scale chips are green pills; selected chip filled.
- Chart sits inside a white rounded card with soft shadow.
- Legend shows both "Trong ngưỡng" and "Ngoài ngưỡng".
- Axis start/end dates under the chart.
- Three stat tiles below: purple Average, amber In-range %, blue Readings — values change with scale.
- Layout holds at 1.3× font scale; toggling unit re-renders the average correctly.

- [ ] **Step 4: Verify with the `verify` skill (drive the real flow, not just tests)**

---

## Task 7: Documentation sync

**Files:**
- Modify: `PLAN.md` (Session 5 block)
- Modify: `PRD.md` (Charts section)

> These are done in this planning turn (see the plan commit), listed here for completeness of the record.

- [ ] **Step 1:** `PLAN.md` Session 5 — note the design retrofit + stat cards in scope/acceptance and reference this plan file.
- [ ] **Step 2:** `PRD.md` Charts section — add a line that the Trends screen shows summary stat tiles (Average / In-range % / reading count) for the selected scale.
- [ ] **Step 3: Commit** (bundled with the plan doc commit).

---

## Self-review notes

- **Spec coverage:** chips (Chip), chart card (Card), band+tooltip (kept), 2-item legend, axis dates, stat cards (StatCard + computeChartStats), typography (AppText/fontFamily), i18n (vi+en), header consistency (_layout) — all mapped to tasks.
- **Out of scope (guard):** no changes to reading CRUD, models, repositories, `transformChartData`, or other sessions. Chart library stays gifted-charts (no SVG rewrite).
- **Type consistency:** `ChartStats { averageMgdl, inRangePercent, readingCount }` is the single shape used by the use case, its tests, and `trends.tsx`. `StatCardProps { value, label, color, onDark }` is stable across Task 3 and Task 5.
