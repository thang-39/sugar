# Plan: Trends Chart Bug Fixes

This document details the root causes and fixes for two layout and styling bugs in the Trends screen line chart:
1. **The overflow bug** (latest point cut off on the right) - *Completed*.
2. **The color mismatch bug** (individual data points using text colors instead of theme indicator colors) - *Pending approval*.

---

## 1. Bug A: Chart Right-Side Overflow & Cutoff (Completed)

### Root Cause
- The horizontal `ScrollView` inside the `<LineChart>` component of `react-native-gifted-charts` was set to a width of `plotWidth` (the grid-only width).
- However, the actual rendered SVG content width inside the `ScrollView` includes additional space (`initialSpacing = 16` and `endSpacing = 16`), making the content wider than the `ScrollView` container.
- Consequently, the third data point (located at `plotWidth + 16`) was pushed outside the visible area of the `ScrollView` and hidden.

### Fix Applied
- We calculated `chartWidth = containerWidth - Y_AXIS_LABEL_WIDTH`.
- We set `<LineChart>`'s `width` prop to `chartWidth`.
- We computed `plotWidth` as `chartWidth - INITIAL_SPACING - endSpacing`.
- This ensures the `ScrollView` matches its content width exactly, removing horizontal scrolling for few points and rendering the last point cleanly with 16px of right-padding.

---

## 2. Bug B: Inconsistent Data Point Colors (Pending)

### Root Cause
In [blood-sugar-chart.tsx](file:///Users/thang/Documents/sugar/src/ui/components/blood-sugar-chart.tsx), individual data points are mapped to colors as follows:
```typescript
const color =
  p.mealTiming !== undefined
    ? statusColor(evaluateReading({ value: p.value, mealTiming: p.mealTiming }, ranges))
    : colors.primary;
```
- `statusColor` is a helper in [reading-display.ts](file:///Users/thang/Documents/sugar/src/ui/utils/reading-display.ts) designed specifically to return high-contrast **TEXT** colors (`colors.lowText` / `colors.highText` / `colors.inRangeText`).
- This results in:
  - Low readings colored yellow-brown (`colors.lowText` = `#8A5D00`).
  - High readings colored dark orange/red (`colors.highText` = `#B23C10`).
  - In-range readings colored dark green (`colors.inRangeText` = `#0A7350`).
- However, the chart legend specifies:
  - **Target range**: Represented by the shaded band (`colors.inRangeBg`).
  - **Out of range**: Represented by a solid orange dot with the color `colors.outOfRange` (`#E8622C`).
- This creates an inconsistency: the actual points plotted on the chart (yellow-brown and dark red) do not match the colors indicated in the legend (orange).

### Proposed Fix
We will update the color mapping logic for data points in [blood-sugar-chart.tsx](file:///Users/thang/Documents/sugar/src/ui/components/blood-sugar-chart.tsx) to align with the design spec:
- If a point is **in-range** (i.e. evaluates to `RangeEvaluation.InRange`), color it green (`colors.primary` / `colors.inRange` = `#0FA36B`).
- If a point is **out-of-range** (i.e. evaluates to `RangeEvaluation.Low` or `RangeEvaluation.High`), color it orange (`colors.outOfRange` = `#E8622C`).
- Aggregated daily averages (where `p.mealTiming === undefined`) remain neutral green (`colors.primary`).

Code update in [blood-sugar-chart.tsx](file:///Users/thang/Documents/sugar/src/ui/components/blood-sugar-chart.tsx):
```typescript
    const items: ChartItem[] = data.points.map((p) => {
      const displayValue = toDisplay(p.value, unit);
      
      let color = colors.primary;
      if (p.mealTiming !== undefined) {
        const evaluation = evaluateReading({ value: p.value, mealTiming: p.mealTiming }, ranges);
        color = evaluation === RangeEvaluation.InRange ? colors.primary : colors.outOfRange;
      }

      return {
        value: displayValue,
        timestamp: p.timestamp,
        count: p.count,
        dataPointColor: color,
        dataPointRadius: 5,
      };
    });
```

---

## 3. Verification Plan

1. **Build & Lint**: Run `npm run lint` to verify syntax.
2. **Unit Tests**: Run `npm test` to verify no regression.
3. **Visual Smoke Test**: Verify that the points on the chart are colored either green (target range) or orange (out of range), perfectly matching the legend.
