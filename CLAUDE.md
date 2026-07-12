# Sugar — Blood Sugar Tracker

Mobile app for logging blood sugar readings, viewing history/trends, and exporting CSV reports for doctors. Primary target audience: Vietnamese users, including elderly users measuring at home — UI must be simple, large text, minimal steps.

**Source of truth for requirements:** `PRD.md` — **v1.1 is authoritative**. All tech-stack and scope deviations (Expo, Expo Router, expo-sqlite + Drizzle, sync deferred post-v1, vi+en i18n) are already baked into it; see its changelog. Do not re-document them here.
**Source of truth for execution order:** `PLAN.md` (Sessions 1–9 + 4.5) then `PLAN-2.md` (Sessions 10–22: GDM pivot, monetization, growth — supersedes the old PLAN.md Session 10). Work on ONE session at a time. Do not implement features from later sessions early.

## Tech Stack

- **Expo** (latest stable SDK), TypeScript strict mode
- **Expo Router** — file-based routing, bottom tabs: Today / Log / History / Trends / Settings
- **expo-sqlite + Drizzle ORM** — local database (keep `syncStatus` column in schema; it stays `pending` until sync ships post-v1)
- **Zustand** — UI/settings state only. Database is the source of truth for readings; do NOT mirror readings into Zustand
- **react-native-gifted-charts** — trends line chart (needs react-native-svg + expo-linear-gradient)
- **i18n**: expo-localization + i18next (`vi` default, `en` fallback)
- **Testing**: Jest + React Native Testing Library; in-memory SQLite for repository tests

## Commands

```bash
npx expo start            # dev server
npm test                  # jest
npm run lint              # eslint
npx tsc --noEmit          # type check — run before declaring a session done
```

## Project Structure

```
app/                      # Expo Router routes only — thin, no business logic
  (tabs)/                 # the 5 tab roots ONLY (see Navigation convention)
    index.tsx             # Today tab
    log.tsx               # Log tab
    history/              # list only (index.tsx)
    trends.tsx
    settings/             # index only
  reading/[id]/           # detail + edit — root-stack screens (dynamic segment)
    index.tsx
    edit.tsx
  report.tsx              # secondary screens: direct children of the root <Stack>
  reminders.tsx
  target-range.tsx
  tracking-mode.tsx
  about.tsx
  onboarding.tsx
src/
  domain/                 # pure TS, no React imports
    models/               # Reading, TargetRange, Unit types
    use-cases/            # createReading, updateReading, exportCsv, transformChartData...
    repositories/         # ports: ReadingRepository, SettingsRepository (interfaces only)
  data/
    db/                   # drizzle schema, migrations, client
    repositories/         # sqlite adapters implementing the domain ports (Sqlite*Repository)
  ui/
    components/           # presentational, dumb
    hooks/                # useReadings, useSettings...
    theme/                # colors, spacing, typography tokens
  i18n/                   # vi.json, en.json, setup
```

Layering rule (Clean Architecture, same as PRD): `app/ → src/ui/ → src/domain/ ← src/data/`. Domain layer imports nothing from React, Expo, or data. Repository **ports (interfaces)** live in `src/domain/repositories/` so use cases depend only on domain; their **sqlite adapters** live in `src/data/repositories/` and implement those ports. Repositories are injected into use cases.

**Navigation convention (back button — read before adding any screen).** There are exactly two kinds of routes:
- **The 5 tab roots** (Log / History list / Trends / Today / Settings index) live under `app/(tabs)/`. Header/title managed per tab as today (in-screen `ScreenHeader` or the tab's own nested Stack for the index title).
- **Every other screen** (detail, edit, report, reminders, target-range, tracking-mode, about, and anything added later) is registered as a **direct child of the root `<Stack>` in `app/_layout.tsx`** — file at `app/<name>.tsx` or `app/<seg>/[id]/*.tsx`, with `options={{ headerShown: true, title: t('…') }}`. Push it from anywhere with an **absolute path** (`/report`, `/reading/[id]`).

**Never wrap a secondary screen in its own intermediate `_layout.tsx` Stack.** A nested stack's *first* screen has `canGoBack() === false`, so React Navigation renders **no back button**. Registering directly under the root stack keeps `(tabs)` beneath the pushed screen → the native header back button appears and pops back to the exact opener (Today, History, or Settings) for free — no manual `headerLeft`/`router.back()`. Rationale + failed-attempt history: `docs/plans/2026-07-12-app-wide-root-navigation.md`.

## Conventions

**TypeScript**
- `strict: true` + `noUncheckedIndexedAccess`. Never `any` — use `unknown` and narrow.
- No `enum` — use `as const` objects with derived union types:
  ```ts
  export const MealType = { Breakfast: 'Breakfast', Lunch: 'Lunch', Dinner: 'Dinner', Snack: 'Snack' } as const;
  export type MealType = (typeof MealType)[keyof typeof MealType];
  ```
- `interface` for domain object shapes; `type` for unions/utility compositions.
- Prefer `undefined` over `null` in app code; normalize `null` from SQLite at the repository boundary.
- Explicit return types on exported functions.
- Files: `kebab-case.ts`. Components: `PascalCase.tsx`. Booleans: `is/has/can` prefix.

**Domain rules (critical, from PRD)**
- Blood sugar values ALWAYS stored in mg/dL (integer). mmol/L is display-only: `mgdl * 0.0555`, shown with 1 decimal. Input in mmol/L converts to mg/dL before storing.
- Validation: 20–600 mg/dL whole numbers. Outside range → warn-only confirm ("outside normal ranges, save anyway?"), never hard-block.
- `hoursAfterMeal`: 0–6, only meaningful when `mealTiming === 'After'`.
- Target range auto-selection: `mealTiming === 'Before'` → fasting range (default 70–100), `'After'` → post-meal range (default 70–140). In-app `Alert.alert` on save when out of range, respecting `alertsEnabled`.
- `recordedAt` = when the reading was taken (user-editable), `createdAt` = when the row was inserted. Never conflate them.

**UI rules**
- Elderly-friendly: base font ≥ 17, primary actions as large full-width buttons, max 1 required decision per screen beyond the value itself. Smart defaults: time = now, mealType by time of day, mealTiming = Before.
- All user-facing strings through i18n — no hardcoded text in components, ever. (Canonical strings like the wellness disclaimer live in PRD, not here.)
- Support system font scaling (`allowFontScaling` stays on); test layouts at 1.3× scale.

**Design System (Evergreen + Rose — Session 4.5, per-mode theming Session 10)**
- Visual reference: `design/Sugar App.dc.html`. To change the look, edit the design in Claude Design → export over this file → have Claude diff it and update `src/ui/theme` + primitives. Never guess token values; always reconcile against the design file.
- **Theme is per tracking mode (Session 10).** `conditionType` selects a color scheme via `CONDITION_PRESETS`: `general` → Evergreen (green), `gestational` → Rose (pink). Only brand/accent tokens differ — layout, spacing, typography are identical across schemes (`src/ui/theme/colors.ts` → `colorSchemes`).
- **Components read colors at runtime via `useTheme()`** (from `src/ui/theme`), NOT the static `colors` import. The static `colors` export is Evergreen-only back-compat; using it in a component breaks Rose mode. New/edited components MUST pull colors from `useTheme()` so they re-theme when the mode changes.
- **Reuse the primitives** in `src/ui/components/ui/` (`AppText`, `Button`, `Card`, `Chip`, `SegmentedControl`, `SectionLabel`, `Stepper`, `ScreenHeader`, `IconTile`, `Badge`, `Toggle`, `Notice`). Do NOT hand-write inline StyleSheet for cards/buttons/chips — extend a primitive if you need a new variant. Screen-specific composites (e.g. `StatCard`, `ListRow`, `SlotCard`) are added by the session that first needs them.
- Spacing/radius/font come only from `src/ui/theme` — no hardcoded hex or magic numbers in components.
- Bold text uses `fontFamily` (Nunito_*), NOT `fontWeight` (RN ignores it on custom fonts). Prefer `AppText` over raw `Text`.
- Icons: Ionicons (`@expo/vector-icons`); `src/ui/utils/meal-display.ts` maps meal types → icons.

**Testing**
- Black-box, behavior-only tests for: reading use cases (create/edit/delete/validate), unit conversion, ExportService (CSV generation + date filtering), ChartDataTransformer (grouping <30d points vs ≥30d daily averages).
- Repository tests against in-memory SQLite. No snapshot tests.

**Git**
- Conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`.
- Commit at the end of each PLAN.md session at minimum. Working tree must build (`tsc --noEmit` passes) before commit.

## Definition of Done (per session)

1. Acceptance criteria in PLAN.md for the session are met
2. `npx tsc --noEmit` and `npm test` pass
3. App boots and the new screen/flow is manually reachable
4. Committed with a conventional commit message
