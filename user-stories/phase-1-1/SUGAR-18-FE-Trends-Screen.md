# SUGAR-18-FE-Trends-Screen

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-27, US-28, US-29, US-30, US-31 |
| **Status** | Not started |
| **Blocked by** | SUGAR-15-FE-Log-Reading-Screen |

---

## Context

The Trends screen shows blood sugar readings as a line chart so users can visually spot patterns. The chart library is `react-native-gifted-charts`.

**Phase 1 scope:** Target range shaded band is NOT built here — it is a Phase 3 feature. The chart shows readings only. The code structure must be ready for the band to be added later.

---

## User Story

> As a **user**, I want to see my blood sugar readings as a line chart so I can visually identify trends and patterns over time.

---

## Acceptance Criteria

### AC-1: Line chart rendered

- Chart library: `react-native-gifted-charts` `LineChart`
- Reads all readings from `readingRepository.getAll()`
- Displays data as a line chart

### AC-2: Time scale picker

Five scale options available as a segmented control or button group:

| Scale | Label | Data shown |
|---|---|---|
| Last 7 days | 7D | Individual data points |
| Last 30 days | 30D | Daily averages |
| Last 90 days | 90D | Daily averages |
| All time | All | Individual data points |
| Custom range | Custom | Daily averages for range ≥30 days; individual points for <30 days |

**Aggregation rule:** Any range at or above 30 days **always** uses daily averages. Any range below 30 days shows individual points.

### AC-3: Daily averages for ≥30 days

- For **30D**, **90D**, and any custom range ≥30 days: individual readings are aggregated into daily averages
- Formula: `sum(values) / count` per day, rounded to nearest integer
- This keeps the chart readable when there are many data points

### AC-4: Individual points for <30 days

- For **7D** and any custom range <30 days: each reading is a single point on the chart
- No aggregation

### AC-5: Custom date range

- "Custom" scale opens a date range picker (From / To date pickers)
- Applying a range shows the chart for that period
- Aggregation follows the ≥30-day rule above
- A "Clear" button resets back to the default 7D view

### AC-6: Tappable data points

- Tapping a data point shows a **tooltip** with:
  - Exact blood sugar value + unit
  - Date/time of that reading
- For averaged data points (≥30 days): tooltip shows the daily average value

### AC-7: Values in user's preferred unit

- Chart values are converted to `mmol/L` if the user's `preferredUnit === 'mmol/L'`
- Unit label shown on the tooltip

### AC-8: Empty state

- When no readings exist: show a friendly message
- Message: *"No data for this period. Log a reading to see your trends."*

### AC-9: Note about target range band

- A small, subtle note at the bottom of the screen:
  *"Target range band will appear after configuring ranges in Settings."*
- This is removed in Phase 3 when the feature is built

### AC-10: Chart updates when new readings are saved

- When the user returns to the Trends tab after logging a reading, the chart reflects the new data

---

## Definition of Done

- [ ] Chart renders with at least one reading
- [ ] All 5 time scales work and update the chart
- [ ] 30D, 90D, and custom ≥30 days show daily averages
- [ ] 7D and custom <30 days show individual points
- [ ] Custom range picker works
- [ ] Tapping a point shows tooltip with value and date
- [ ] Values displayed in user's preferred unit
- [ ] Empty state shown when no data
- [ ] New readings appear after logging

---

## Notes

- The data transformation logic (filtering by scale, computing averages) should live in a **separate function** — ideally in `src/domain/useCases/ChartDataTransformer.ts`
- This keeps the screen component focused on rendering, not business logic
- Chart height should be responsive — fixed pixel height on iOS may clip on small screens
- `react-native-gifted-charts` requires `react-native-linear-gradient` and `react-native-svg` as peer dependencies
