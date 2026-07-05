# Session 7 — CSV Export + Share

> **Post-implementation amendment (2026-07-05, PRD v1.2):** the encoding/delimiter
> below (UTF-8 BOM + comma) was superseded after testing. Excel garbled Vietnamese
> (macOS ignores the UTF-8 BOM) and split columns wrong under a `;`-locale. The file
> is now **UTF-16LE + BOM, tab-delimited**; the escaping helper quotes on tab (not
> comma). See PRD.md "CSV format (locked spec)" and `src/data/export/utf16le.ts`.
> Everything else below still holds.

**PLAN.md ref:** Day 2 → Session 7. **PRD:** stories 37, 39–41; "CSV format (locked spec)" (PRD.md:144–152); "Input, Formatting & Locale Rules" (dates/timezone PRD.md:138–142).

**Goal:** From Settings → Export, pick a time range, generate a spec-locked CSV client-side, and share it via the native share sheet. File opens correctly in Excel/Numbers with Vietnamese notes intact (UTF-8 BOM).

---

## Scope decisions (locked)

- **Meal column → localized** by the app's current language (Ăn sáng / Breakfast …). *User-confirmed.* Labels are injected into the pure use case from i18n; domain stays i18n-free.
- **Timing column → `Before` / `After` (English)**, per the PRD locked spec (PRD.md:151). Intentional asymmetry with Meal — PRD wins over friendliness on the locked columns. Documented here so it isn't "fixed" later.
- **Date/Time/Value → locale-independent** exactly per spec: `yyyy-MM-dd`, `HH:mm` (24h), value with `.` decimal separator. NOT the localized `formatDate`/`formatTime` helpers.
- **Timezone:** date/time components are the device's local timezone at export time (PRD.md:141). Derived from `new Date(recordedAt)` local getters; injected clock keeps the use case testable.
- **Row order:** oldest-first in the file (chronological for a doctor). `repository.list()` returns newest-first → reverse.
- **Range presets:** `All / 3 months / 6 months / Custom` (mirror History's `FilterPreset` pattern in `app/(tabs)/history/index.tsx`).

---

## Layering

Pure CSV generation lives in `src/domain` (no Expo). The file-write + share side effect is a thin platform adapter in `src/data`. UI orchestrates.

```
app/(tabs)/settings/export.tsx      ← range picker + Export button (orchestration only)
  └─ src/data/export/share-csv.ts   ← expo-file-system write + expo-sharing (side effect adapter)
       └─ src/domain/use-cases/export-readings-csv.ts  ← pure: readings → CSV string
       └─ src/domain/use-cases/export-filename.ts       ← pure: range → filename
```

---

## Work items

### 1. Dependencies
- `npx expo install expo-file-system expo-sharing` (SDK 54–compatible). `@react-native-community/datetimepicker` already present (History uses it).

### 2. Domain — pure, fully unit-tested
**`src/domain/models/export.ts`**
```ts
export interface CsvColumnLabels {           // injected localized Meal labels
  meal: Record<MealType, string>;
}
export interface ExportOptions {
  unit: Unit;
  labels: CsvColumnLabels;
  formatRecordedAt: (recordedAt: number) => { date: string; time: string }; // device-tz, ISO
}
export const ExportRangePreset = { All:'all', Last3Months:'last3m', Last6Months:'last6m', Custom:'custom' } as const;
export type ExportRangePreset = (typeof ExportRangePreset)[keyof typeof ExportRangePreset];
```

**`src/domain/use-cases/export-readings-csv.ts`** — `exportReadingsCsv(readings: readonly Reading[], opts: ExportOptions): string`
- Prepend UTF-8 BOM (`﻿`).
- Header row: `Date,Time,Value,Unit,Meal,Timing,Hours After,Notes`.
- One row per reading (caller passes already-filtered + oldest-first list):
  - `Date`/`Time` ← `opts.formatRecordedAt(recordedAt)`.
  - `Value` ← mg/dL: `String(value)`; mmol/L: `mgdlToMmol(value).toFixed(1)` (`.` separator).
  - `Unit` ← `opts.unit` (`mg/dL` | `mmol/L`).
  - `Meal` ← `opts.labels.meal[mealType]` (localized).
  - `Timing` ← literal `mealTiming` (`Before`/`After`).
  - `Hours After` ← `mealTiming === After ? String(hoursAfterMeal ?? '') : ''` (empty when Before).
  - `Notes` ← `notes ?? ''`.
- **RFC 4180 escaping** helper: field wrapped in `"..."` iff it contains `,`, `"`, `\n`, or `\r`; inner `"` doubled. Line terminator `\r\n`.

**`src/domain/use-cases/export-filename.ts`** — `buildExportFilename(range: {from?: number; to?: number}, now, formatDateCompact): string`
- `sugar-export-<yyyyMMdd>-<yyyyMMdd>.csv` for a bounded range; `sugar-export-all-<yyyyMMdd>.csv` when unbounded (uses `now` for the trailing stamp).

**`src/domain/use-cases/resolve-export-range.ts`** (small pure helper) — preset + now → `{ from?, to? }` (Last3M = now − 3 months start-of-day, etc.). Keeps date math out of the screen and testable. Mirror History's `startOfDay`.

### 3. Data — platform adapter
**`src/data/export/share-csv.ts`** — `generateAndShareCsv(deps)`:
- `readingRepo.list(filter)` → reverse to oldest-first.
- Read `preferredUnit` + `preferredLanguage` (or accept from caller).
- Build labels + `formatRecordedAt` (local-tz ISO), call `exportReadingsCsv`.
- Write string to `FileSystem.documentDirectory + filename` (`encoding: UTF8`).
- `await Sharing.isAvailableAsync()` guard → `Sharing.shareAsync(uri, { mimeType:'text/csv', UTI:'public.comma-separated-values-text' })`.
- Returns a result/throws; screen shows `Alert` on error (reuse `index.tsx performDelete` pattern).

### 4. UI — `app/(tabs)/settings/export.tsx`
- Replace `PlaceholderScreen`. `ScreenHeader` + `Card`s + `Chip` presets (All / 3 months / 6 months / Custom) — reuse History's picker layout.
- Custom → two `DateTimePicker`s (from / to), same inline pattern as History.
- Full-width primary `Button` "Export" → `generateAndShareCsv`, `isLoading` spinner, disabled while running.
- Empty state: if 0 readings in range, disable Export + hint text.
- All strings via i18n.

### 5. i18n — extend `screens.settings.export` in `vi.json` + `en.json`
New keys: `rangeLabel`, presets (`all`/`last3m`/`last6m`/`custom`), `from`, `to`, `exportButton`, `exporting`, `empty`, `shareUnavailable`, `error`. (Reuse existing `screens.readings.mealTypes.*` for Meal labels.)

### 6. Tests — `src/domain/use-cases/__tests__/export-readings-csv.test.ts`
Pure-function style (like `compute-chart-stats.test.ts`), with a `reading(...)` builder and a fixed `formatRecordedAt`:
- **BOM** present as first char.
- Header row exact + column order.
- **Escaping:** notes with comma, `"` (doubled), embedded `\n` → quoted.
- **Unit column** matches preference; mmol/L value has exactly one decimal with `.`.
- **Hours After** empty when timing = Before; populated when After.
- Localized Meal label appears; Timing stays `Before`/`After`.
- Empty readings → header (+BOM) only.
- `export-filename.test.ts`: bounded vs all naming; `resolve-export-range.test.ts`: preset → from/to bounds.

---

## Acceptance (from PLAN.md)
- Exported file opens in Excel/Numbers with Vietnamese notes intact (UTF-8 BOM).
- `npx tsc --noEmit` + `npm test` green; no React/Expo import in `src/domain`.
- Manually: pick each preset + custom range → share sheet appears → file contents correct.
- Commit: `feat: csv export with share sheet`

## Out of scope
XLSX/PDF (deferred), any change to other screens/domain models, sync.
