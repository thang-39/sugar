# Implementation Plan — 3 Days

Rule: one session per Claude Code conversation. Start each session by reading `CLAUDE.md`, this file's session block, and the referenced PRD sections. Finish with the Definition of Done in CLAUDE.md. Do not pull work from future sessions.

Scope = **PRD v1.1** (authoritative — includes the "Input, Formatting & Locale Rules" and "Store & Health-App Compliance" sections). Account & Sync is already moved to Deferred inside the PRD; everything here is local-only. Where this plan and the PRD conflict, the PRD wins — flag the conflict instead of guessing.

---

## Day 1 — Foundation + Core Logging

### Session 1: Scaffold + theme + navigation shell — ✅ DONE (PR #12)
Shipped: Expo SDK + Router, strict TS, 4-tab shell with Ionicons + i18n (vi default), theme tokens, placeholder screens, deps for later sessions, Node pinned.

- Follow-up carried into Session 2: `chore: remove unused template assets` (react-logo*, expo-badge*, tutorial-web, tabIcons/ — tab bar uses Ionicons, these are dead files).

### Session 2: Data layer
**Goal:** schema, repositories, domain use cases — fully tested, no UI.

- Drizzle schema: `readings` + `app_settings` exactly per PRD data model (keep `syncStatus`, default `'pending'`; `userId` nullable)
- Migration setup + db client (`src/data/db/`)
- `ReadingRepository`: create, update, delete, getById, list(filter: dateRange, sort newest-first), count
- `SettingsRepository`: typed get/set for `preferredUnit`, `preferredLanguage`, `fastingRange`, `postMealRange`, `alertsEnabled`, `onboardingDone`
- Domain: `Reading` model, unit conversion helpers per PRD "Input, Formatting & Locale Rules" (round mgdl→mmol to 1 decimal; round mmol→mgdl to nearest integer; round-trip rule must hold), validation (20–600 int mg/dL / 1.1–33.3 mmol/L), `create/update/delete-reading` use cases, target-range evaluation (`evaluateReading(reading, ranges) → 'in-range' | 'low' | 'high'` with Before/After auto-selection)
- Tests: conversion round-trips (typed mmol value redisplays unchanged), validation edges (19, 20, 600, 601, decimals in mg/dL, comma decimal separator in mmol/L), range evaluation for both contexts, repository CRUD + date filtering on in-memory SQLite

**Accept:** `npm test` green, no React imports anywhere in `src/domain`. Commit: `feat: data layer — schema, repositories, reading use cases`

### Session 3: Log Reading screen (PRD stories 1–5, 8; "Log Reading Screen" section)
**Goal:** the core screen — logging works end to end.

- Single scrollable form: numeric value (large input, keyboard numeric; when unit = mmol/L allow one decimal and accept both `.` and `,` as separator per PRD Input Rules), unit toggle mg/dL↔mmol/L (persists preference), meal type chips, Before/After toggle, "hours after meal" appears only when After (integer stepper 0–6), collapsed notes (500 max), editable date/time picker defaulting to now
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

### Session 4.5: Design System (Evergreen) + shared UI primitives
- Translate design tokens from `design/Sugar App.dc.html` into `src/ui/theme` (Evergreen: green `#0FA36B`, CTA ink `#1B2B24`, bg `#F7FBF8`, surface `#E9F5EF`). Semantic token names kept stable; only values change.
- Load Nunito font (`@expo-google-fonts/nunito`) via the boot gate; bold text uses `fontFamily` tokens, not `fontWeight` (RN ignores it on custom fonts).
- Build shared presentational primitives in `src/ui/components/ui/`: `AppText`, `Button`, `Card`, `Chip`, `SegmentedControl`, `SectionLabel`, `Stepper`, `ScreenHeader`, `IconTile`, `Badge`.
- Retrofit already-built screens (Log, History list/detail/edit) onto the theme + primitives. No domain/data or logic changes.
- From Session 5 on, all screens build on these primitives; see the Design System section in `CLAUDE.md`.

**Accept:** `tsc`/tests green (no test changes); Log + History render Evergreen green + Nunito + pill buttons; layout holds at 1.3× font scale. Detailed plan: `docs/plans/2026-07-05-session-4.5-design-system.md`. Commit: `feat: design system — evergreen theme, shared UI primitives`

---

## Day 2 — Trends, Ranges, Export

### Session 5: Trends chart (stories 27–32; PRD "Charts")
- Line chart, time scales: 7d / 30d / 90d / All / custom range
- <30 days → individual points; ≥30 days → daily averages (via `ChartDataTransformer` in domain, unit-tested; daily bucket boundaries in device timezone per PRD)
- Target range as shaded band; tap point → tooltip with value + timestamp
- Y axis respects preferred unit
- Summary stat tiles (Average / In-range % / Readings) via `computeChartStats` domain use case, unit-tested

**Accept:** transformer tests green; band + tooltip verified manually. Commit: `feat: trends chart`

**Session 5 design retrofit (post-implementation):** Session 5 was first built with inline styles, before the Evergreen design system. Retrofit onto the shared primitives (`ScreenHeader`, `Chip`, `Card`, `AppText`) + add the design's 3 stat tiles and 2-item legend, reconciled against `design/Sugar App.dc.html`. UI-only (plus the pure `computeChartStats` use case); no domain/data or other-session changes. Detailed plan: `docs/plans/2026-07-05-session-5-trends-design.md`. Commit: `feat: apply evergreen design to trends screen`

### Session 6: Target ranges + alerts + settings screens (stories 33–36, 43, 46, 53–55)
- Settings → Target Range screen: two ranges (Fasting/Before, After) editable in preferred unit, stored in mg/dL; alerts on/off toggle
- Settings index: unit preference, language switch vi/en (story 53, persists as `preferredLanguage`), links to Target Range / Export / About
- About: version + disclaimer + privacy policy link (story 55; URL can be a placeholder until Session 10 publishes the page)
- **Delete all data (story 54, PRD "Clear All Local Data")**: two-step confirmation (explicit permanent-loss warning → press-and-hold or typed confirm), wipes `readings`, resets `app_settings` to defaults. Lands on the Log tab for now; redirect-to-onboarding is wired in Session 8 when onboarding exists.

**Accept:** changing unit re-renders history/chart/form correctly with converted values and no range migration; changing language re-renders all tabs instantly; delete-all leaves a fresh-install data state (empty history, defaults restored). Commit: `feat: settings — target ranges, language, delete all data`

### Session 7: CSV export + share (stories 37, 39–41; PRD "CSV format (locked spec)")
- Settings → Export: range picker (All / 3 months / 6 months / custom)
- Implement the locked CSV spec exactly: UTF-8 with BOM, RFC 4180 escaping, columns `Date, Time, Value, Unit, Meal, Timing, Hours After, Notes`, ISO `yyyy-MM-dd` + `HH:mm` (locale-independent), value in preferred unit with `.` decimal separator, filename `sugar-export-<yyyyMMdd>-<yyyyMMdd>.csv` / `sugar-export-all-<yyyyMMdd>.csv`
- Generated client-side (expo-file-system), shared via expo-sharing
- ExportService unit tests: escaping (commas/quotes/newlines in notes), BOM present, date filtering, unit column matches preference, Hours After empty when timing is Before

**Accept:** exported file opens correctly in Excel/Numbers with Vietnamese notes intact (UTF-8 BOM). Detailed plan: `docs/plans/2026-07-05-session-7-csv-export.md`. Commit: `feat: csv export with share sheet`

---

## Day 3 — Onboarding, Polish, Ship

### Session 8: Onboarding + first-run flow (stories 47–48)
- 1 screen: tagline, unit picker, language picker, disclaimer, Get Started / Skip (skip → vi + mg/dL defaults)
- Shown once (`onboardingDone` setting)
- Wire Session 6's delete-all-data flow to redirect here after wipe (fresh-install experience)

**Accept:** fresh install shows onboarding once; skip lands on Log tab; delete-all → onboarding shows again. Commit: `feat: onboarding`

### Session 9: Polish + accessibility pass (story 52 + elderly-first goal)
- Audit every screen at 1.3× font scale — no clipped text, no broken layouts
- accessibilityLabel/Role on all interactive elements; contrast check on badges/chart colors
- Haptic + visual feedback on save; loading/empty/error states everywhere
- App icon + splash screen (simple, high-contrast)

**Accept:** VoiceOver/TalkBack can complete log→history→export flow. Commit: `feat: accessibility and ui polish`

### Session 10: Build + store prep (PRD "Store & Health-App Compliance")
- `eas build` config, production builds for iOS + Android
- app.json: bundle IDs, permissions audit (should need none beyond storage/share), privacy strings
- Publish privacy policy static page (GitHub Pages is fine) per PRD compliance section; wire the real URL into the About screen (replaces Session 6 placeholder)
- Store checklist: screenshots (vi), description draft (vi + en — no diagnose/treat/manage claims, phrase as "log and track"), Google Play Data Safety (nothing collected) + Health Apps declaration, Apple App Privacy "Data Not Collected"

**Accept:** installable build on a real device; store checklist complete. Commit: `chore: eas build config and store assets`

---

## Deferred (post-3-days)

PRD v1.1 "Deferred" section is authoritative: Supabase auth + sync (stories 12–20 — schema already carries `syncStatus`/`userId` so no migration needed), push notifications, XLSX/PDF export, paid tier. Suggested next milestone: sync + "family view" (con cái xem số liệu bố mẹ) as the premium feature.
