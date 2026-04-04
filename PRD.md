# Blood Sugar Tracker — PRD

## Problem Statement

Managing blood sugar readings on paper is inconvenient, error-prone, and hard to share with a doctor. Patients who check their blood sugar multiple times a day after meals need a simple, digital way to log readings with context (before/after meal, time relative to meal), view their history and trends over time, and export or share reports — all from their phone.

## Solution

A cross-platform (iOS & Android) mobile app for tracking blood sugar readings. The app allows users to:

- Log a blood sugar reading with time, value, meal context (meal type + before/after + hours after), and optional notes
- Store all entries locally on the device (guest mode) or sync to the cloud via a user account
- View history as a chronological list and trends as a line chart
- Export readings to CSV with a selectable time range (all, last N months, or custom date range)
- Share an exported file with their doctor
- Optionally set blood sugar target ranges and receive in-app alerts when readings fall outside the range

---

## User Stories

### Core Logging

1. As a user, I want to log a blood sugar reading (numeric value) with the current date and time, so that I don't have to write it on paper.
2. As a user, I want to tag a reading with a meal type (Breakfast, Lunch, Dinner, Snack), so that I know what meal the reading is associated with.
3. As a user, I want to specify whether a reading was taken before or after a meal, so that I can understand how food affects my blood sugar.
4. As a user, I want to specify how many hours after a meal a reading was taken (e.g., "2 hours after lunch"), so that I can track post-meal spikes accurately.
5. As a user, I want to add optional free-text notes to a reading (e.g., "felt dizzy", "ate a big meal"), so that I can capture context that may be relevant to my doctor.
6. As a user, I want to edit a previously logged reading, so that I can correct mistakes.
7. As a user, I want to delete a reading, so that I can remove accidental or invalid entries.
8. As a user, I want to see a confirmation after saving a reading, so that I know the entry was recorded successfully.

### Guest Mode (Local Storage)

9. As a user, I want to use the app without creating an account, so that I can start tracking immediately without friction.
10. As a user, my data in guest mode is stored only on my device, so that I know it is private and does not leave my phone. *(Known limitation: data is lost if the app is reinstalled.)*
11. As a user, I want all my data to persist across app restarts in guest mode, so that I can access my full history at any time.

### Account & Sync

12. As a user, I want to create an account with email and password, so that my data can be backed up and synced across devices.
13. As a user, I want to log in to my account, so that I can access my data on another device.
14. As a user, I want to log out of my account, so that I can switch to another account or back to guest mode.
15. As a user, I want my data to sync manually (on demand), so that I control when data is transmitted.
16. ~~As a user, I want data to sync automatically once daily at midnight when logged in~~ — **Deferred to v2.** Foreground-triggered auto-sync used instead: when the app comes to the foreground, if >24h since last sync, auto-sync triggers automatically.
17. As a logged-in user on multiple devices, I want data from all devices to merge into one history (not overwrite), so that I have a complete record regardless of which device was used.
18. As a user, I want to resolve conflicts if the same reading (same timestamp) is recorded on two devices at nearly the same time, so that no data is lost. *(Resolved silently server-wins; a toast notification appears post-sync informing the user that duplicates were merged.)*
19. As a user, I want a clear indicator of sync status (last synced time, syncing in progress), so that I know whether my data is up to date. *(Subtle header icon: ✓ synced / 🔄 syncing / ⏳ N pending / 🚫 offline. Tap for detail popover with last synced time, pending count, and "Sync Now" button.)*
20. As a user, I want a way to switch from guest mode to a full account and migrate local data into the account, so that I can preserve my history when I decide to sign up. *(Explicit migration prompt after account creation, showing reading count and date range.)*

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
34. As a user, I want to receive a notification when a reading falls outside my target range, so that I am alerted immediately. *(In-app alert only for v1; push notifications deferred to v2.)*
35. As a user, I want to set different target ranges for different contexts (e.g., fasting vs. after meals), so that alerts are contextually accurate. *(Two ranges: Fasting/Before Meal + After Meal. The app auto-selects based on `mealTiming`.)*
36. As a user, I want to be able to enable or disable target range alerts, so that I can control notification frequency.

### Export & Reports

37. As a user, I want to export my readings to a CSV file, so that I can share my data with my doctor or import it into another tool.
38. ~~As a user, I want to export my readings to an Excel (XLSX) file~~ — **Deferred to v2.** CSV only in v1.
39. As a user, I want to choose the time range for export: all data, last N months, or a custom date range, so that I can share exactly the period my doctor needs. *(All / Last 3 months / Last 6 months / Custom date range.)*
40. As a user, I want the exported file to include: date, time, blood sugar value, meal type, before/after, hours after meal, notes, so that the doctor has full context.
41. As a user, I want to share the exported file directly from the app (e.g., via iOS/Android share sheet), so that I can send it to my doctor via email, messaging, or other apps.
42. ~~As a user, I want a print-friendly or PDF-style summary view~~ — **Deferred to v2.**

### Settings & Preferences

43. As a user, I want to choose my preferred blood sugar unit (mg/dL or mmol/L), so that the app matches the unit used in my country and by my doctor. *(Available in onboarding, in Settings, and on the log form itself.)*
44. As a user, I want to change my account password, so that I can keep my account secure.
45. As a user, I want to delete my account and all associated data, so that I can remove my data from the service if I choose. *(Password re-confirmation required; local data stays on device after deletion.)*
46. As a user, I want to see the app version and basic info in a settings or about screen, so that I know which version I am using.

### Onboarding

47. As a new user, I want to see a brief onboarding flow that explains the app's purpose and how to log my first reading, so that I can start using it immediately. *(1 screen: welcome + unit preference + disclaimer.)*
48. As a new user, I want to be able to skip onboarding and go straight to guest mode, so that I am not forced through extra steps.

### Accessibility & Edge Cases

49. As a user, I want the app to handle offline mode gracefully (no network), so that I can still log readings even without internet.
50. As a user, I want a reading to be saved locally even if sync fails, so that I never lose an entry.
51. As a user, I want a reading to be queued for sync when made offline and synced automatically when connectivity returns, so that my data stays up to date without manual intervention. *(Uses `@react-native-community/netinfo`; triggers sync when connectivity transitions from offline to online.)*
52. As a visually impaired user, I want the app to support screen readers and proper contrast, so that I can use it independently.

---

## Implementation Decisions

### Tech Stack

| Layer | Decision |
|---|---|
| **Framework** | React Native (bare, not Expo). Min iOS 14, Android API 24. |
| **Local database** | WatermelonDB — reactive, sync-ready, built on SQLite |
| **Backend** | Supabase — auth, PostgreSQL database, handles sync plumbing |
| **State management** | Zustand — single store, persists to AsyncStorage via `persist` middleware |
| **Navigation** | React Navigation — bottom tabs (4 tabs) + per-tab stack navigators |
| **Charts** | react-native-gifted-charts — interactive line charts with tappable data points |
| **Export** | CSV only, generated client-side. Native share sheet for sharing. |
| **Notifications** | In-app alert only (Alert.alert on reading save if out of range). Push notifications (FCM/APNs) deferred to v2. |
| **Connectivity** | `@react-native-community/netinfo` — detects online/offline state transitions to trigger sync |

### Navigation Structure

```
Bottom Tab Navigator:
├── Log Tab        → LogReadingScreen (single-screen form)
├── History Tab    → HistoryListScreen → ReadingDetailScreen → EditReadingScreen
├── Trends Tab     → TrendsScreen
└── Settings Tab   → SettingsScreen
                    ├── Target Range Screen
                    ├── Export Screen
                    ├── Account Screen (Login / Register / Delete Account)
                    └── About Screen
```

Sync status indicator: subtle icon in the top header bar of the active tab. Tap for a popover showing last synced time, pending count, and "Sync Now" button.

### Onboarding

- 1 screen: app purpose tagline, unit preference (mg/dL / mmol/L), disclaimer text, "Get Started" button, "Skip" link.
- Skip → guest mode, unit defaults to mg/dL.
- "This app is for personal wellness tracking only. It is not a medical device." displayed as disclaimer text.

### Log Reading Screen

- Single-screen scrollable form. Smart defaults: time = now, meal type = Breakfast, mealTiming = Before.
- When mealTiming = "After", the "hours after meal" field appears.
- Notes field collapsed by default, expands on tap.
- Unit toggle (mg/dL ↔ mmol/L) visible on the form, remembers last used preference.
- Validation: value must be 20–600 mg/dL (whole numbers only). Out-of-range values trigger a warn-only confirmation ("This reading is outside normal ranges. Save anyway?").
- `recordedAt` is editable via a date/time picker (defaults to now). `syncStatus` is read-only and managed by the sync engine.

### Target Ranges

- Two ranges: Fasting/Before Meal (default: 70–100 mg/dL) and After Meal (default: 70–140 mg/dL).
- Context auto-detection: if `mealTiming === "Before"` → use fasting range; if `"After"` → use after-meal range.
- In-app alert (Alert.alert) fires immediately when saving a reading that falls outside the relevant range.

### Sync Strategy

- **Foreground-triggered auto-sync**: when app comes to foreground, check `lastSyncedAt`; if >24h, trigger sync automatically.
- **Connectivity-triggered sync**: `@react-native-community/netinfo` listens for online transitions and triggers sync when connectivity returns.
- **Manual sync**: "Sync Now" button in sync status popover.
- **Merge logic**: server is source of truth. Duplicate detection: same `userId` + `recordedAt` within 60-second window → keep server's copy.
- **Post-sync toast**: "Sync complete. N readings synced." If duplicates were merged: "N duplicate readings merged."
- **Conflict resolution**: silent server-wins + informational toast.

### Guest-to-Account Migration

- After account creation, show explicit migration prompt: "We found N readings on your device (date range). Import them into your new account?"
- Existing cloud data is preserved; guest readings are appended.

### Account Deletion

- Password re-confirmation required before deletion.
- Supabase account and cloud data are permanently deleted.
- Local data stays on device; user returns to guest mode.

### Export

- Accessed via Settings → Export Data.
- Format: CSV only.
- Date ranges: All / Last 3 months / Last 6 months / Custom date range.
- CSV columns: Date, Time, Value, Unit, Meal, Timing, Hours After, Notes.
- Generated client-side; shared via native share sheet.

### Charts

- Library: react-native-gifted-charts.
- Time scales: 7 days / 30 days / 90 days / All Time / Custom date range.
- X-axis grouping: individual data points for <30 days; daily averages for 30+ days.
- Target range shown as a shaded band on the chart.
- Tap data point → tooltip showing exact blood sugar value and timestamp.

### Data Model (WatermelonDB)

**Table: readings**
| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Client-generated |
| `userId` | string | `null` for guest mode |
| `value` | number | In mg/dL (always) |
| `mealType` | string | Breakfast / Lunch / Dinner / Snack |
| `mealTiming` | string | Before / After |
| `hoursAfterMeal` | number | 0–6, nullable |
| `notes` | string | Max 500 chars, nullable |
| `recordedAt` | number | Unix timestamp (when reading was taken) |
| `createdAt` | number | Unix timestamp (when entry was created) |
| `updatedAt` | number | Unix timestamp (last edit) |
| `syncStatus` | string | `synced` / `pending` / `conflict` |

**Table: app_settings**
| Field | Type | Notes |
|---|---|---|
| `id` | string | Key identifier |
| `key` | string | Indexed |
| `value` | string | JSON-serialized value |
| `updatedAt` | number | Unix timestamp |

Keys stored: `preferredUnit`, `fastingRange`, `postMealRange`, `lastSyncedAt`, `alertsEnabled`.

### Architecture

Clean Architecture / layered approach:
```
UI Layer (React components / screens)
  ↓
Domain / Use-Case Layer (business logic: createReading, syncReadings, exportCSV)
  ↓
Data / Repository Layer (WatermelonDB repository, Supabase client)
```

Repository pattern abstracts local (WatermelonDB) and remote (Supabase) data sources. Dependency injection provides repositories to use cases.

### Value Storage Convention

- All blood sugar values stored internally in mg/dL.
- Conversion to mmol/L (`value * 0.0555`) happens only at the display layer, based on user's `preferredUnit` setting.
- Target ranges stored in mg/dL, converted on display. Changing preferred unit does not require range migration.
- Input: user enters value in their preferred unit; app converts to mg/dL before storing.

### Testing

Modules to test (black-box, behavior-only):
- **ReadingEntry use case** — create, edit, delete, validate inputs
- **SyncService** — merge, conflict resolution, offline queue
- **ExportService** — CSV generation, date range filtering
- **ChartDataTransformer** — grouping and aggregation by time scale
- **AuthService** — login, logout, token management

Tools: Jest + React Native Testing Library. In-memory test database for repository tests.

---

## Out of Scope (v1)

- Push notification reminders ("Time to check your blood sugar!")
- Push notifications for target-range alerts *(in-app alert only)*
- Excel (XLSX) export
- PDF report generation
- Automatic midnight sync scheduler *(foreground-triggered sync used instead)*
- Multi-language / internationalization — English only
- Dark mode / theming — light theme only
- Apple Watch / Wear OS companion apps
- Bluetooth glucometer integration
- Social features
- Healthcare provider portal
- Advanced analytics / AI insights
- HIPAA compliance / medical device certification
- Multi-device sync for free tier *(paid tier consideration for v2)*
- Social login (OAuth)

---

## Deferred to v2

- Push notifications (APNs / FCM) for target-range alerts
- Midnight auto-sync scheduler (BGTaskScheduler / WorkManager)
- Excel (XLSX) export
- PDF report / print-friendly summary
- Paid tier design (free vs. paid boundary)
- Social login
- Multi-device sync for free users

---

## Further Notes

- The app must clearly state it is a personal wellness tracking tool and **not** a medical device. Disclaimer shown in onboarding.
- Guest mode data lives only on the device. Reinstalling the app loses this data — accepted limitation.
- The 60-second duplicate detection window for conflict resolution may be configurable in future versions.
- The paid tier structure should be revisited after v1 is built to ensure the data model doesn't need restructuring.