# Blood Sugar Tracker — PRD

**Version 1.1** — 2026-07-04

## Changelog

### v1.1 (2026-07-04)
- **Tech stack updated to match implementation** (see table): Expo managed workflow replaces bare RN; Expo Router replaces manual React Navigation; expo-sqlite + Drizzle replaces WatermelonDB.
- **Account & Sync (stories 12–20) moved from v1 to Deferred.** v1 ships as local-only (guest mode is the entire product). Schema keeps `userId` + `syncStatus` so sync lands later without migration.
- **Vietnamese + English i18n added to v1 scope** (was: English only). Vietnamese is the default language; VN market is the positioning.
- **New stories 53–55**: language switching, clear-all-local-data, privacy policy access.
- **New section "Input, Formatting & Locale Rules"**: mmol/L input rules, rounding, CSV date/number format, timezone handling, hoursAfterMeal precision.
- **New section "Store & Health-App Compliance"**: privacy policy, Google Play Health declaration, Apple review prep, data-safety answers.
- Backup behavior note corrected (OS-level backup applies to the local DB).

### v1.0
- Initial PRD.

---

## Problem Statement

Managing blood sugar readings on paper is inconvenient, error-prone, and hard to share with a doctor. Patients who check their blood sugar multiple times a day after meals need a simple, digital way to log readings with context (before/after meal, time relative to meal), view their history and trends over time, and export or share reports — all from their phone.

**Primary audience (v1.1):** Vietnamese users, including elderly users measuring at home with a personal glucometer, and their adult children who help them track. UI must be extremely simple: large text, large touch targets, minimal required decisions per screen.

## Solution

A cross-platform (iOS & Android) mobile app for tracking blood sugar readings. The app allows users to:

- Log a blood sugar reading with time, value, meal context (meal type + before/after + hours after), and optional notes
- Store all entries locally on the device (local-only in v1; cloud sync deferred)
- View history as a chronological list and trends as a line chart
- Export readings to CSV with a selectable time range (all, last N months, or custom date range)
- Share an exported file with their doctor
- Optionally set blood sugar target ranges and receive in-app alerts when readings fall outside the range
- Use the app fully in Vietnamese or English

---

## User Stories

### Core Logging

1. As a user, I want to log a blood sugar reading (numeric value) with the current date and time, so that I don't have to write it on paper.
2. As a user, I want to tag a reading with a meal type (Breakfast, Lunch, Dinner, Snack), so that I know what meal the reading is associated with.
3. As a user, I want to specify whether a reading was taken before or after a meal, so that I can understand how food affects my blood sugar.
4. As a user, I want to specify how many hours after a meal a reading was taken (e.g., "2 hours after lunch"), so that I can track post-meal spikes accurately. *(Integer hours 0–6; see Input Rules.)*
5. As a user, I want to add optional free-text notes to a reading (e.g., "felt dizzy", "ate a big meal"), so that I can capture context that may be relevant to my doctor.
6. As a user, I want to edit a previously logged reading, so that I can correct mistakes.
7. As a user, I want to delete a reading, so that I can remove accidental or invalid entries.
8. As a user, I want to see a confirmation after saving a reading, so that I know the entry was recorded successfully.

### Local-Only Storage (v1 behavior)

9. As a user, I want to use the app without creating an account, so that I can start tracking immediately without friction.
10. As a user, my data is stored only on my device, so that I know it is private and does not leave my phone. *(The database participates in standard OS backups — iCloud device backup / Android Auto Backup — so restoring a device backup restores readings. A fresh install without restoring a backup starts empty.)*
11. As a user, I want all my data to persist across app restarts, so that I can access my full history at any time.

### Account & Sync — **moved to Deferred (post-v1)**

*Stories 12–20 (email/password account, login/logout, manual + foreground-triggered sync, multi-device merge, conflict resolution, sync status indicator, guest-to-account migration) are unchanged in content but deferred in full. See "Deferred" section. The v1 schema retains `userId` (nullable) and `syncStatus` (default `pending`) so these stories can be implemented without a data migration.*

### History View

21. As a user, I want to see a chronological list of all my readings, so that I can review my history.
22. As a user, I want each list item to show at a minimum: date, time, blood sugar value, and meal context.
23. As a user, I want to filter my history by a specific date range, so that I can focus on a particular period.
24. As a user, I want to tap on a reading in the history list to view or edit its full details, so that I can review or correct past entries. *(View-only detail screen; separate edit screen via "Edit" button.)*
25. As a user, I want the history list to be sorted newest-first by default, so that my most recent readings appear first.
26. As a user, I want to see a summary count of readings in the current filter/view, so that I know how many entries are shown.

### Trends / Charts

27. As a user, I want to see a line chart of my blood sugar readings over time, so that I can visually identify trends and patterns.
28. As a user, I want to toggle the chart time scale (7 days, 30 days, 90 days, all time, or custom date range), so that I can focus on the timeframe relevant to me.
29. As a user, I want to see my readings grouped by day in the chart, so that daily patterns are clear. *(Individual points for <30 days; daily averages for 30+ days.)*
30. As a user, I want both the chart view and the history list view accessible from the same main screen, so that I can switch between visual trends and raw data easily. *(Separate tabs: History and Trends are both top-level tabs.)*
31. As a user, I want to see the blood sugar value displayed when I tap a data point on the chart, so that I can read exact values.
32. As a user, I want to see my target range displayed as a shaded band on the chart (if target ranges are set), so that I can instantly see when readings are out of range.

### Target Ranges & Alerts

33. As a user, I want to set my personal blood sugar target range (min and max values), so that the app can help me know if I am in range. *(Two ranges: Fasting/Before Meal and After Meal.)*
34. As a user, I want to receive a notification when a reading falls outside my target range, so that I am alerted immediately. *(In-app alert only for v1; push notifications deferred.)*
35. As a user, I want to set different target ranges for different contexts (e.g., fasting vs. after meals), so that alerts are contextually accurate. *(Two ranges: Fasting/Before Meal + After Meal. The app auto-selects based on `mealTiming`.)*
36. As a user, I want to be able to enable or disable target range alerts, so that I can control notification frequency.

### Export & Reports

37. As a user, I want to export my readings to a CSV file, so that I can share my data with my doctor or import it into another tool.
38. ~~Excel (XLSX) export~~ — **Deferred.** CSV only in v1.
39. As a user, I want to choose the time range for export: all data, last N months, or a custom date range, so that I can share exactly the period my doctor needs. *(All / Last 3 months / Last 6 months / Custom date range.)*
40. As a user, I want the exported file to include: date, time, blood sugar value, meal type, before/after, hours after meal, notes, so that the doctor has full context.
41. As a user, I want to share the exported file directly from the app (e.g., via iOS/Android share sheet), so that I can send it to my doctor via email, messaging, or other apps.
42. ~~Print-friendly / PDF summary~~ — **Deferred.**

### Settings & Preferences

43. As a user, I want to choose my preferred blood sugar unit (mg/dL or mmol/L), so that the app matches the unit used in my country and by my doctor. *(Available in onboarding, in Settings, and on the log form itself.)*
44. ~~Change account password~~ — **Deferred with Account & Sync.**
45. ~~Delete account and cloud data~~ — **Deferred with Account & Sync.** *(v1 equivalent: story 54, clear all local data.)*
46. As a user, I want to see the app version and basic info in a settings or about screen, so that I know which version I am using. *(Includes the medical disclaimer and a link to the privacy policy.)*

### Onboarding

47. As a new user, I want to see a brief onboarding flow that explains the app's purpose and how to log my first reading, so that I can start using it immediately. *(1 screen: welcome + language + unit preference + disclaimer.)*
48. As a new user, I want to be able to skip onboarding and go straight to using the app, so that I am not forced through extra steps. *(Skip → Vietnamese + mg/dL defaults.)*

### Accessibility & Edge Cases

49. As a user, I want the app to work fully offline, so that I can log readings without internet. *(Trivially true in v1 — the app is local-only and makes no network calls.)*
50. As a user, I want a reading to be saved locally immediately on save, so that I never lose an entry.
51. ~~Offline sync queue~~ — **Deferred with Account & Sync.**
52. As a visually impaired user, I want the app to support screen readers and proper contrast, so that I can use it independently. *(Also: all layouts must survive 1.3× system font scaling.)*

### New in v1.1

53. As a user, I want to switch the app language between Vietnamese and English at any time in Settings, so that the app matches my preference. *(Default follows device locale; `vi` if device is Vietnamese, else `en`.)*
54. As a user, I want to permanently delete all data stored on my device (with a confirmation step), so that I can reset the app or remove my health data before selling/giving away my phone.
55. As a user, I want to read the privacy policy from within the app (About screen link), so that I understand what happens to my data.

---

## Input, Formatting & Locale Rules *(new in v1.1)*

### Value entry and units

- **Canonical storage:** always integer mg/dL. This never changes regardless of display unit.
- **mg/dL input:** whole numbers only. Valid range 20–600. Values outside range trigger a warn-only confirmation ("This reading is outside normal ranges. Save anyway?") — never a hard block.
- **mmol/L input:** one decimal place allowed (e.g., `5.6`). Both `.` and `,` are accepted as the decimal separator on input (Vietnamese keyboards produce `,`). Valid range **1.1–33.3 mmol/L** (the mg/dL range converted).
- **Conversion & rounding:**
  - Display mg/dL → mmol/L: `round(mgdl * 0.0555, 1 decimal)`.
  - Input mmol/L → storage: `round(mmol / 0.0555)` to nearest integer mg/dL.
  - Round-trip rule: the value the user just typed in mmol/L must redisplay unchanged after save (display conversion of the stored integer must equal the typed value to 1 decimal). Unit tests must cover representative values across the range.
- **`hoursAfterMeal`:** integers 0–6 only (stepper UI). No half-hours in v1 — keeps the elderly-first UI simple.

### Dates, times, timezone

- `recordedAt`, `createdAt`, `updatedAt` are Unix timestamps (UTC by nature).
- All display and grouping (history sections, chart daily buckets, date filters) use the **device's current timezone** at render time. No timezone is stored per reading in v1; if the user travels, historical readings shift display accordingly — accepted limitation, documented here.
- Date display format follows the app language: `dd/MM/yyyy` for Vietnamese, locale default for English. Time is 24-hour in Vietnamese, locale default in English.

### CSV format (locked spec)

- Encoding: **UTF-8 with BOM** (required for Excel to render Vietnamese notes correctly).
- Delimiter: comma. Fields containing commas, quotes, or newlines are double-quoted per RFC 4180.
- Columns, in order: `Date, Time, Value, Unit, Meal, Timing, Hours After, Notes`.
- `Date`: ISO `yyyy-MM-dd`. `Time`: `HH:mm` (24h). Locale-independent on purpose — sorts correctly in any spreadsheet tool regardless of the doctor's Excel locale.
- `Value`: in the user's preferred unit at export time. mg/dL → integer; mmol/L → one decimal **with `.` as separator** (locale-independent).
- `Unit`: `mg/dL` or `mmol/L`. `Timing`: `Before` / `After`. `Hours After`: empty when timing is Before.
- Filename: `sugar-export-<yyyyMMdd>-<yyyyMMdd>.csv` (range start–end) or `sugar-export-all-<yyyyMMdd>.csv`.

---

## Implementation Decisions

### Tech Stack *(updated v1.1 — matches the codebase)*

| Layer                | Decision                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Framework**        | **Expo (managed workflow)**, TypeScript strict. Min iOS 14, Android API 24.                                   |
| **Routing**          | **Expo Router** (file-based, built on React Navigation) — bottom tabs (4 tabs) + per-tab stacks               |
| **Local database**   | **expo-sqlite + Drizzle ORM** (schema retains `userId`/`syncStatus` for future sync)                          |
| **Backend**          | **None in v1.** Supabase (auth + sync) deferred — see Deferred section                                        |
| **State management** | Zustand — UI/settings state only; SQLite is the source of truth for readings                                  |
| **Charts**           | react-native-gifted-charts — interactive line charts with tappable data points                                |
| **i18n**             | i18next + expo-localization — `vi` default, `en` fallback; all user-facing strings via i18n                   |
| **Export**           | CSV only, generated client-side (expo-file-system). Native share sheet (expo-sharing).                        |
| **Notifications**    | In-app alert only (Alert.alert on reading save if out of range). Push (FCM/APNs) deferred.                    |
| **Build/Distribution** | EAS Build for iOS + Android production builds                                                               |
| **Testing**          | Jest + React Native Testing Library; in-memory SQLite for repository tests                                    |

### Navigation Structure

```
Bottom Tab Navigator (Expo Router (tabs) group):
├── Log Tab        → LogReadingScreen (single-screen form)
├── History Tab    → HistoryListScreen → ReadingDetailScreen → EditReadingScreen
├── Trends Tab     → TrendsScreen
└── Settings Tab   → SettingsScreen
                    ├── Target Range Screen
                    ├── Export Screen
                    └── About Screen (version, disclaimer, privacy policy link)
Root: onboarding (first run only)
```

### Onboarding

- 1 screen: app purpose tagline, language picker (vi/en), unit preference (mg/dL / mmol/L), disclaimer text, "Get Started" button, "Skip" link.
- Skip → Vietnamese + mg/dL defaults.
- Disclaimer (shown in onboarding and About):
  - EN: "This app is for personal wellness tracking only. It is not a medical device."
  - VI: "Ứng dụng chỉ hỗ trợ theo dõi sức khoẻ cá nhân, không phải thiết bị y tế."

### Log Reading Screen

- Single-screen scrollable form. Smart defaults: time = now, mealTiming = Before, mealType inferred from time of day (before 11:00 Breakfast, 11:00–15:00 Lunch, 15:00–18:00 Snack, after 18:00 Dinner).
- When mealTiming = "After", the "hours after meal" stepper (0–6) appears.
- Notes field collapsed by default, expands on tap. Max 500 chars.
- Unit toggle (mg/dL ↔ mmol/L) visible on the form, persists preference.
- Validation and rounding per "Input, Formatting & Locale Rules".
- `recordedAt` editable via date/time picker (defaults to now). `syncStatus` is not user-visible.
- Elderly-first: value input is the dominant element; saving with all defaults must take ≤3 taps (focus value → type → Save).

### Target Ranges

- Two ranges: Fasting/Before Meal (default: 70–100 mg/dL) and After Meal (default: 70–140 mg/dL).
- Context auto-detection: `mealTiming === "Before"` → fasting range; `"After"` → after-meal range.
- Ranges edited in the user's preferred unit, stored in mg/dL; changing preferred unit requires no migration.
- In-app alert (Alert.alert) fires immediately when saving an out-of-range reading, respecting the alerts-enabled toggle.

### Clear All Local Data *(new, story 54)*

- Settings → About (or Settings root) → "Delete all data".
- Two-step confirmation: explicit warning that this is permanent, then a typed/press-and-hold confirm.
- Wipes `readings` and resets `app_settings` to defaults; returns to onboarding.

### Export

- Accessed via Settings → Export Data.
- Format: CSV only, spec locked in "Input, Formatting & Locale Rules".
- Date ranges: All / Last 3 months / Last 6 months / Custom date range.
- Generated client-side; shared via native share sheet.

### Charts

- Library: react-native-gifted-charts.
- Time scales: 7 days / 30 days / 90 days / All Time / Custom date range.
- X-axis grouping: individual data points for <30 days; daily averages for 30+ days (daily bucket boundaries in device timezone).
- Target range shown as a shaded band.
- Tap data point → tooltip showing exact value (preferred unit) and timestamp.

### Data Model (Drizzle / SQLite)

**Table: readings**

| Field            | Type          | Notes                                                        |
| ---------------- | ------------- | ------------------------------------------------------------ |
| `id`             | string (UUID) | Client-generated                                             |
| `userId`         | string        | Nullable; unused until sync ships                            |
| `value`          | integer       | Always mg/dL                                                 |
| `mealType`       | string        | Breakfast / Lunch / Dinner / Snack                           |
| `mealTiming`     | string        | Before / After                                               |
| `hoursAfterMeal` | integer       | 0–6, nullable; only meaningful when mealTiming = After       |
| `notes`          | string        | Max 500 chars, nullable                                      |
| `recordedAt`     | integer       | Unix timestamp (when reading was taken; user-editable)       |
| `createdAt`      | integer       | Unix timestamp (row insertion; never edited)                 |
| `updatedAt`      | integer       | Unix timestamp (last edit)                                   |
| `syncStatus`     | string        | `synced` / `pending` / `conflict`; default `pending` in v1   |

**Table: app_settings**

| Field       | Type   | Notes                 |
| ----------- | ------ | --------------------- |
| `id`        | string | Key identifier        |
| `key`       | string | Indexed               |
| `value`     | string | JSON-serialized value |
| `updatedAt` | integer| Unix timestamp        |

Keys stored: `preferredUnit`, `preferredLanguage`, `fastingRange`, `postMealRange`, `alertsEnabled`, `onboardingDone`. *(`lastSyncedAt` returns with sync.)*

### Architecture

Clean Architecture / layered:

```
app/ (Expo Router routes — thin)
  ↓
src/ui (components, hooks, theme)
  ↓
src/domain (pure TS: models, use cases — no React/Expo imports)
  ↑
src/data (Drizzle schema, repositories)
```

Repository pattern abstracts the SQLite data source; repositories are injected into use cases. This boundary is where the remote (Supabase) source plugs in later.

### Testing

Modules to test (black-box, behavior-only):

- **Reading use cases** — create, edit, delete, validate inputs
- **Unit conversion** — round-trip rules per Input Rules section
- **ExportService** — CSV generation, RFC 4180 escaping, BOM, date range filtering, unit column
- **ChartDataTransformer** — grouping and aggregation by time scale, timezone-correct daily buckets
- ~~SyncService, AuthService~~ — deferred with sync

Tools: Jest + React Native Testing Library. In-memory SQLite for repository tests.

---

## Store & Health-App Compliance *(new in v1.1)*

- **Privacy policy** — required by both stores. Static page (can be a GitHub Pages URL) stating: all data is stored on-device; the app collects nothing, transmits nothing, has no analytics, no ads, no third-party SDKs that phone home. Linked from the About screen (story 55) and both store listings.
- **Google Play** — complete the Data Safety form (no data collected/shared) and the **Health Apps declaration** (Play Console requires declaring health-related functionality; category: personal wellness/fitness tracking, not medical). Target API level per current Play requirements at submission time.
- **Apple App Store** — App Privacy "Data Not Collected". Expect health-app scrutiny: the in-app disclaimer, no dosage/insulin advice, and no diagnostic claims are what keep this in the wellness category rather than a regulated medical device. App description must not claim to diagnose, treat, or manage diabetes — phrase as "log and track your readings".
- **Never add** insulin-dose calculation or treatment recommendations without regulatory review — that crosses into medical-device territory in most jurisdictions.

---

## Out of Scope (v1)

- Push notification reminders and push target-range alerts *(in-app alert only)*
- Excel (XLSX) export, PDF report generation
- Dark mode / theming — light theme only
- Apple Watch / Wear OS companion apps
- Bluetooth glucometer integration
- Social features, healthcare provider portal
- Advanced analytics / AI insights
- HIPAA compliance / medical device certification
- Languages beyond Vietnamese + English

## Deferred (post-v1)

- **Account & Sync (stories 12–20)** — Supabase auth, manual + foreground-triggered sync, connectivity-triggered sync, server-wins merge with 60-second duplicate window, sync status indicator, guest-to-account migration, account password change, account deletion. The original v1.0 "Sync Strategy", "Guest-to-Account Migration", and "Account Deletion" sections remain the design of record for this work.
- Push notifications (APNs / FCM)
- Midnight auto-sync scheduler (BGTaskScheduler / WorkManager)
- Excel (XLSX) export; PDF / print-friendly summary
- Paid tier design — candidate premium feature: **family view** (adult children remotely view a parent's readings; requires sync first)
- Social login (OAuth)

---

## Further Notes

- The app must clearly state it is a personal wellness tracking tool and **not** a medical device. Disclaimer shown in onboarding and About.
- Local data participates in OS device backups by default (iCloud backup / Android Auto Backup). A fresh install without restoring a backup starts empty.
- The paid tier structure should be revisited after v1 ships to ensure the data model doesn't need restructuring.
