# Implementation Plan — 3 Days

Rule: one session per Claude Code conversation. Start each session by reading `CLAUDE.md`, this file's session block, and the referenced PRD sections. Finish with the Definition of Done in CLAUDE.md. Do not pull work from future sessions.

Scope for these 3 days = PRD v1 **minus** Account & Sync (stories 12–20 deferred; guest mode stories 9–11 are in scope). Everything is local-only.

---

## Day 1 — Foundation + Core Logging

### Session 1: Scaffold + theme + navigation shell
**Goal:** empty but navigable app with 4 tabs, theme tokens, i18n wired.

- `npx create-expo-app` (TypeScript template), Expo Router, ESLint + strict tsconfig per CLAUDE.md
- Install: drizzle-orm, expo-sqlite, zustand, i18next, expo-localization, react-native-gifted-charts, react-native-svg, expo-linear-gradient
- Tab layout: Log / History / Trends / Settings with icons + i18n'd labels (vi + en files created, vi default)
- `src/ui/theme/` tokens: colors, spacing, typography (base 17)
- Placeholder screens for every route in the structure from CLAUDE.md

**Accept:** app boots on Expo Go, 4 tabs switch, labels render in Vietnamese, `tsc --noEmit` clean. Commit: `chore: scaffold expo app with router, i18n, theme`

### Session 2: Data layer
**Goal:** schema, repositories, domain use cases — fully tested, no UI.

- Drizzle schema: `readings` + `app_settings` exactly per PRD data model (keep `syncStatus`, default `'pending'`; `userId` nullable)
- Migration setup + db client (`src/data/db/`)
- `ReadingRepository`: create, update, delete, getById, list(filter: dateRange, sort newest-first), count
- `SettingsRepository`: typed get/set for `preferredUnit`, `fastingRange`, `postMealRange`, `alertsEnabled`, `onboardingDone`
- Domain: `Reading` model, unit conversion helpers (mgdl↔mmol, PRD Value Storage Convention), validation (20–600 int), `create/update/delete-reading` use cases, target-range evaluation (`evaluateReading(reading, ranges) → 'in-range' | 'low' | 'high'` with Before/After auto-selection)
- Tests: conversion round-trips, validation edges (19, 20, 600, 601, decimals), range evaluation for both contexts, repository CRUD + date filtering on in-memory SQLite

**Accept:** `npm test` green, no React imports anywhere in `src/domain`. Commit: `feat: data layer — schema, repositories, reading use cases`

### Session 3: Log Reading screen (PRD stories 1–5, 8; "Log Reading Screen" section)
**Goal:** the core screen — logging works end to end.

- Single scrollable form: numeric value (large input, keyboard numeric), unit toggle mg/dL↔mmol/L (persists preference), meal type chips, Before/After toggle, "hours after meal" appears only when After (0–6 stepper), collapsed notes (500 max), editable date/time picker defaulting to now
- Smart defaults: mealType from time of day (—11h Breakfast, 11–15h Lunch, 15–18h Snack, 18h— Dinner)
- Save → validation warn-flow for out-of-bounds → target-range check → in-app alert if out of range and alerts enabled → success confirmation → form resets
- Everything through use cases; the screen holds no business logic

**Accept:** can log a reading in ≤3 taps with defaults (enter value → Save); reading persisted across app restart. Commit: `feat: log reading screen`

### Session 4: History list + detail + edit + delete (stories 6, 7, 21–26)
- History tab: newest-first list — each row: date, time, value (in preferred unit), meal context badge, out-of-range indicator color
- Date-range filter + visible count of shown entries
- Tap row → read-only detail screen → Edit button → edit screen (reuses Log form component prefilled) ; delete with confirm
- Empty state with friendly prompt to log first reading

**Accept:** full CRUD via UI, filter works, edit updates `updatedAt` not `createdAt`. Commit: `feat: history list, detail, edit, delete`

**End of Day 1 = usable tracker.**

---

## Day 2 — Trends, Ranges, Export

### Session 5: Trends chart (stories 27–32; PRD "Charts")
- Line chart, time scales: 7d / 30d / 90d / All / custom range
- <30 days → individual points; ≥30 days → daily averages (via `ChartDataTransformer` in domain, unit-tested)
- Target range as shaded band; tap point → tooltip with value + timestamp
- Y axis respects preferred unit

**Accept:** transformer tests green; band + tooltip verified manually. Commit: `feat: trends chart`

### Session 6: Target ranges + alerts + settings screens (stories 33–36, 43, 46)
- Settings → Target Range screen: two ranges (Fasting/Before, After) editable in preferred unit, stored in mg/dL; alerts on/off toggle
- Settings index: unit preference, language (vi/en), links to Target Range / Export / About
- About: version + disclaimer

**Accept:** changing unit re-renders history/chart/form correctly with converted values and no range migration. Commit: `feat: settings, target ranges, alerts config`

### Session 7: CSV export + share (stories 37, 39–41; PRD "Export")
- Settings → Export: range picker (All / 3 months / 6 months / custom)
- CSV columns exactly: Date, Time, Value, Unit, Meal, Timing, Hours After, Notes — generated client-side (expo-file-system), shared via expo-sharing
- ExportService unit tests: escaping (commas/quotes/newlines in notes), date filtering, unit column matches preference

**Accept:** exported file opens correctly in Excel/Numbers with Vietnamese notes intact (UTF-8 BOM). Commit: `feat: csv export with share sheet`

---

## Day 3 — Onboarding, Polish, Ship

### Session 8: Onboarding + first-run flow (stories 47–48)
- 1 screen: tagline, unit picker, language picker, disclaimer, Get Started / Skip (skip → vi + mg/dL defaults)
- Shown once (`onboardingDone` setting)

**Accept:** fresh install shows onboarding once; skip lands on Log tab. Commit: `feat: onboarding`

### Session 9: Polish + accessibility pass (story 52 + elderly-first goal)
- Audit every screen at 1.3× font scale — no clipped text, no broken layouts
- accessibilityLabel/Role on all interactive elements; contrast check on badges/chart colors
- Haptic + visual feedback on save; loading/empty/error states everywhere
- App icon + splash screen (simple, high-contrast)

**Accept:** VoiceOver/TalkBack can complete log→history→export flow. Commit: `feat: accessibility and ui polish`

### Session 10: Build + store prep
- `eas build` config, production builds for iOS + Android
- app.json: bundle IDs, permissions audit (should need none beyond storage/share), privacy strings
- Store assets checklist: screenshots (vi), description draft (vi + en), privacy policy URL (required by both stores — generate a static page), data-safety form answers (all data on-device, nothing collected)

**Accept:** installable build on a real device; store checklist complete. Commit: `chore: eas build config and store assets`

---

## Deferred (post-3-days, PRD stays authoritative)

Supabase auth + sync (stories 12–20, PRD "Sync Strategy" — schema already carries `syncStatus`/`userId` so no migration needed), push notifications, XLSX/PDF export, paid tier. Suggested next milestone: sync + "family view" (con cái xem số liệu bố mẹ) as the premium feature.
