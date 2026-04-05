# Plan: Blood Sugar Tracker

> Source PRD: `/home/thang/Works/sugar/PRD.md`

## Architectural Decisions

Durable decisions that apply across all phases:

- **Routes / Navigation**: React Navigation — 4 bottom tabs (Log, History, Trends, Settings) with per-tab stack navigators. Sync status indicator in the top header bar of the active tab; tap for popover with last synced time, pending count, and "Sync Now" button.
- **Schema**: WatermelonDB on-device SQLite. Two tables: `readings` and `app_settings`. All blood sugar values stored in mg/dL internally; conversion to mmol/L happens at display layer only.
- **Key models**:
  - `readings`: `id` (client UUID), `userId` (null = guest), `value` (mg/dL), `mealType` (Breakfast/Lunch/Dinner/Snack), `mealTiming` (Before/After), `hoursAfterMeal` (0–6, nullable), `notes` (max 500, nullable), `recordedAt` (Unix timestamp), `createdAt`, `updatedAt`, `syncStatus` (synced/pending/conflict)
  - `app_settings`: key-value store. Keys: `preferredUnit`, `fastingRange`, `postMealRange`, `lastSyncedAt`, `alertsEnabled`
- **State management**: Zustand single store, persisted to AsyncStorage via `persist` middleware
- **Sync**: Supabase-backed. Server-wins conflict resolution. 60-second duplicate detection window. Auto-sync on foreground (>24h since last sync) and on connectivity transition (offline → online).
- **Architecture**: Clean Architecture — UI Layer → Domain/Use-Case Layer → Repository Layer (WatermelonDB + Supabase)
- **Export format**: CSV only, client-side generation, shared via native share sheet

---

## Phase 1: Project Scaffolding + Core Logging (Guest Mode)

**User stories**: 1–8, 9–11, 47–48, 49–52

### What to build

Scaffold a React Native bare project with all dependencies (WatermelonDB, Supabase, Zustand, React Navigation, react-native-gifted-charts, netinfo, AsyncStorage). Set up the Clean Architecture folder structure: `src/ui/screens/`, `src/domain/useCases/`, `src/data/repositories/`, `src/data/models/`. Configure WatermelonDB schema (readings + app_settings tables). Set up Zustand store and persist middleware. Implement the onboarding flow (1 screen: tagline, unit preference mg/dL/mmol/L, disclaimer, "Get Started" + "Skip"). Implement the Log Reading screen end-to-end: scrollable form with smart defaults (time=now, mealType=Breakfast, mealTiming=Before), date/time picker for `recordedAt`, mealTiming=After reveals "hours after meal" field, collapsible notes field, unit toggle (remembers preference), validation (value 20–600 mg/dL, warn-only confirmation for out-of-range values), save → WatermelonDB write, confirmation feedback. Implement offline handling: reading always saved locally first; sync queue managed by the sync engine.

### Acceptance criteria

- [ ] `npx react-native init` produces a working bare RN project that builds on iOS and Android
- [ ] WatermelonDB schema matches the `readings` + `app_settings` table definitions
- [ ] Zustand store persists to AsyncStorage and hydrates on app restart
- [ ] Onboarding screen shown on first launch; "Skip" enters guest mode with default unit mg/dL
- [ ] Log Reading form saves a reading to WatermelonDB and shows a confirmation
- [ ] Offline: a reading is saved locally and marked `pending`; no data is lost if sync fails
- [ ] Unit toggle on form converts input to mg/dL before storing and remembers the preference

---

## Phase 2: History + Detail / Edit

**User stories**: 21–26, 30 (History tab)

### What to build

History list screen (newest-first chronological list) as a top-level tab. Each list item displays: date, time, blood sugar value (in preferred unit), meal context chip (meal type + before/after + hours after if applicable), optional notes preview. Reading count badge for the current view. Date-range filter (calendar picker) with "Clear filter" option. Tap a row → detail screen (read-only view of all fields). "Edit" button on detail screen → edit screen pre-populated with the reading's data; same validation and save flow as Phase 1, updates `updatedAt` timestamp.

### Acceptance criteria

- [ ] History tab is the second bottom tab and is accessible without logging in
- [ ] List is sorted newest-first by default
- [ ] Each row shows date, time, value (with correct unit), and meal context
- [ ] Date-range filter updates the list and shows the count of filtered results
- [ ] Tapping a row opens a read-only detail screen
- [ ] "Edit" opens a pre-populated form; saving updates the entry and its `updatedAt`
- [ ] Delete is accessible from the detail screen (removes from WatermelonDB)

---

## Phase 3: Trends / Charts

**User stories**: 27–32, 30 (Trends tab)

### What to build

Trends screen as a top-level tab (third bottom tab). Line chart powered by react-native-gifted-charts. Time scale picker: 7 days / 30 days / 90 days / All Time / Custom date range. For <30 days: individual data points. For ≥30 days: daily averages. Tappable data points show a tooltip with exact value and timestamp. Target range shaded band rendered on the chart if target ranges are set (Phase 4 dependency — if not yet set, no band shown). Chart data is transformed from raw reading records via a `ChartDataTransformer` use case.

### Acceptance criteria

- [ ] Trends tab is the third bottom tab
- [ ] Line chart renders readings for the selected time scale
- [ ] All 5 time scale options work correctly (7d / 30d / 90d / All / Custom)
- [ ] Individual points for <30 days; daily averages for ≥30 days
- [ ] Tapping a point shows tooltip with exact value and timestamp
- [ ] Target range shaded band appears when target ranges are configured (Phase 4)
- [ ] Chart updates reactively when new readings are added

---

## Phase 4: Target Ranges + In-App Alerts

**User stories**: 33–36, 72

### What to build

Target Range settings screen (nested under Settings). Two range inputs: Fasting/Before Meal (default 70–100 mg/dL) and After Meal (default 70–140 mg/dL). Each input accepts min and max values. Alerts enable/disable toggle (default: on). When saving a reading from the Log screen, the sync engine checks the value against the relevant range based on `mealTiming` (Before → fasting range, After → after-meal range). If out of range and alerts are enabled, an `Alert.alert` fires immediately showing which range was exceeded. Ranges are stored in `app_settings` (fastingRange, postMealRange, alertsEnabled) and rendered as a shaded band on the chart (Phase 3 dependency).

### Acceptance criteria

- [ ] Target Range screen is accessible from Settings
- [ ] Fasting range defaults to 70–100 mg/dL; After Meal range defaults to 70–140 mg/dL
- [ ] Ranges are saved to app_settings and persist across restarts
- [ ] Alerts toggle controls whether out-of-range alerts fire
- [ ] Saving a reading with mealTiming=Before checks against fasting range; After checks against after-meal range
- [ ] Alert.alert fires with a clear message if value is outside the relevant range and alerts are enabled
- [ ] Shaded band on Trends chart reflects the current target ranges

---

## Phase 5: Account & Cloud Sync

**User stories**: 12–20, 44–45, 50–51

### What to build

Supabase auth: login, register, logout screens (accessible from Settings → Account). Account deletion with password re-confirmation. Sync engine that handles: (a) foreground-triggered auto-sync when app comes to foreground and >24h since last sync, (b) connectivity-triggered sync via `@react-native-community/netinfo` on offline→online transitions, (c) manual "Sync Now" from sync status popover. Merge logic: server-wins; duplicate detection on `userId` + `recordedAt` within 60-second window. Post-sync toast: "Sync complete. N readings synced." / "N duplicate readings merged." Guest-to-account migration: post-registration prompt showing device reading count and date range; guest readings are appended to cloud data. Sync status header icon (✓ synced / 🔄 syncing / ⏳ N pending / 🚫 offline); tap for popover with last synced time, pending count, and "Sync Now" button. Account deletion removes cloud data; user returns to guest mode.

### Acceptance criteria

- [ ] User can register with email/password and login/logout
- [ ] Sync engine triggers on app foreground (>24h gap) and on connectivity restoration
- [ ] Manual "Sync Now" button in sync status popover works
- [ ] Duplicate readings (same userId + recordedAt within 60s) are merged server-wins
- [ ] Post-sync toast shows sync count and any duplicate merges
- [ ] Sync status icon is visible and accurate across all tabs
- [ ] Guest-to-account migration prompt appears after registration with correct reading count and date range
- [ ] Account deletion removes cloud data and returns user to guest mode

---

## Phase 6: Export & Reports

**User stories**: 37, 39–41, 81

### What to build

Export Data screen accessible from Settings. Date range picker: All / Last 3 months / Last 6 months / Custom date range (calendar). CSV generated client-side with columns: Date, Time, Value, Unit, Meal, Timing, Hours After, Notes. Unit column reflects user's current `preferredUnit` setting. Native share sheet (iOS share sheet / Android intent) invoked to share the file. Export runs against WatermelonDB (offline-first; no network required).

### Acceptance criteria

- [ ] Export screen is accessible from Settings
- [ ] All 4 date range options work (All / Last 3 months / Last 6 months / Custom)
- [ ] CSV contains all columns: Date, Time, Value, Unit, Meal, Timing, Hours After, Notes
- [ ] Export works fully offline
- [ ] Native share sheet opens with the generated CSV file

---

## Phase 7: Polish, Settings & About

**User stories**: 43, 46

### What to build

Unit toggle (mg/dL ↔ mmol/L) accessible on the Log form, in Settings, and persisted. Changing unit updates display immediately throughout the app (no re-save of readings required — conversion happens at display layer only). About screen (accessible from Settings): app name, version number, and a reminder that this app is a personal wellness tool and not a medical device. Full accessibility pass: screen reader labels on all interactive elements, minimum contrast ratios, focus management on forms. End-to-end smoke test verifying the full user flow from onboarding → log a reading → view in history → view in trends.

### Acceptance criteria

- [ ] Unit toggle visible on Log form and in Settings; preference persists across restarts
- [ ] Changing unit updates all displayed values (history list, trends chart, detail screen) without re-saving readings
- [ ] About screen shows app version and the medical disclaimer
- [ ] All screens have appropriate `accessibilityLabel` / `accessibilityHint` props
- [ ] Smoke test: new user → onboarding → log reading → history → trends → export → all work end-to-end
