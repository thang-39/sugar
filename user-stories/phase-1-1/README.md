# Phase 1-1 — Foundation

> **PRD:** `/home/thang/Works/sugar/PRD.md`
> **Parent plan:** `/home/thang/Works/sugar/plans/blood-sugar-tracker.md`
> **Backlog:** `/home/thang/Works/sugar/user-stories/backlog/` (BE stories moved here — to be rewritten)

## Scope

Phase 1-1 establishes the full app foundation for the frontend. Backend stories (Supabase setup, database schema, RLS, API documentation) have been moved to the backlog to be revisited later.

After completing all frontend tasks, a new user can:
1. See onboarding → pick unit → enter the app
2. Log a blood sugar reading
3. View it in the history list
4. View it in the trends chart
5. Edit and delete readings
6. Use the app fully offline

Cloud sync, account management, target ranges, and export are **Phase 2+**.

---

## User Stories Covered

| PRD # | Story |
|---|---|
| US-1 | Log a blood sugar reading with date/time |
| US-2 | Tag with meal type |
| US-3 | Specify before or after meal |
| US-4 | Specify hours after meal |
| US-5 | Add optional notes (max 500 chars) |
| US-6 | Edit a reading |
| US-7 | Delete a reading |
| US-8 | See confirmation after saving |
| US-9 | Use app without an account (guest mode) |
| US-10 | Data stored only on device |
| US-11 | Data persists across restarts |
| US-19 | Sync status indicator |
| US-21 | View chronological history list |
| US-22 | List item shows date, time, value, meal context |
| US-23 | Filter history by date range |
| US-25 | Sorted newest-first |
| US-26 | Reading count shown |
| US-27 | Line chart of readings over time |
| US-28 | Toggle chart time scale |
| US-29 | Grouped by day (points vs. averages) |
| US-30 | History and Trends accessible from main screen |
| US-31 | Tap chart point → tooltip with value |
| US-43 | Choose preferred unit (mg/dL ↔ mmol/L) |
| US-46 | About screen with version + disclaimer |
| US-47 | Brief onboarding flow |
| US-48 | Skip onboarding → guest mode |
| US-49 | Handle offline mode gracefully |
| US-50 | Reading saved locally even if sync fails |
| US-51 | Reading queued for sync when offline |
| US-52 | Screen reader support + contrast |

---

## All User Stories (Frontend only)

| ID | Title |
|---|---|
| SUGAR-06-FE | Project Scaffold |
| SUGAR-07-FE | Clean Architecture Folder Structure |
| SUGAR-08-FE | WatermelonDB Schema & Models |
| SUGAR-09-FE | Database Singleton |
| SUGAR-10-FE | Zustand Store |
| SUGAR-11-FE | Domain Layer & Use Cases |
| SUGAR-12-FE | Repositories |
| SUGAR-13-FE | Navigation Setup |
| SUGAR-14-FE | Onboarding Screen |
| SUGAR-15-FE | Log Reading Screen |
| SUGAR-16-FE | History List Screen |
| SUGAR-17-FE | Reading Detail & Edit Screens |
| SUGAR-18-FE | Trends Screen |
| SUGAR-19-FE | Settings Screen |
| SUGAR-20-FE | Supabase Client + SyncEngine |
| SUGAR-21-FE | Offline Detection |
| SUGAR-22-FE | Sync Status Indicator |
| SUGAR-23-FE | Accessibility |

---

## Implementation Order

```
1. SUGAR-06-FE  (React Native scaffold)
2. SUGAR-07-FE  (folder structure)
3. SUGAR-08-FE  (WatermelonDB schema)
4. SUGAR-09-FE  (database singleton)
5. SUGAR-10-FE  (Zustand store)
6. SUGAR-11-FE  (domain use cases)
7. SUGAR-12-FE  (repositories)
8. SUGAR-13-FE  (navigation)
9. SUGAR-14-FE  (onboarding)
10. SUGAR-15-FE (log reading — core)
11. SUGAR-16-FE (history list)
12. SUGAR-17-FE (detail + edit)
13. SUGAR-18-FE (trends)
14. SUGAR-19-FE (settings + about)
15. SUGAR-20-FE (Supabase client + sync engine interface)
16. SUGAR-21-FE (offline detection — wires NetInfo to syncEngine)
17. SUGAR-22-FE (sync status indicator)
18. SUGAR-23-FE (accessibility)
```

---

## Key Dependencies

```
SUGAR-06-FE
  └── SUGAR-07-FE
        ├── SUGAR-08-FE
        │     └── SUGAR-09-FE
        │           └── SUGAR-12-FE
        │                 └── SUGAR-15-FE
        │                       ├── SUGAR-16-FE
        │                       └── SUGAR-18-FE
        ├── SUGAR-10-FE
        │     └── SUGAR-13-FE
        │           └── SUGAR-14-FE
        └── SUGAR-11-FE
              └── SUGAR-12-FE

SUGAR-10-FE + SUGAR-12-FE + SUGAR-20-FE
  └── SUGAR-21-FE
        └── SUGAR-22-FE

All screens built
  └── SUGAR-23-FE
```

---

## What's NOT in Phase 1-1

- Supabase project setup, database schema, RLS policies, API docs → **backlog** (to be rewritten)
- Account creation / login / logout (Phase 2 — Account & Sync)
- Cloud sync to Supabase (Phase 5)
- Guest-to-account migration (Phase 2)
- Target ranges (Phase 3)
- In-app alerts for out-of-range readings (Phase 3)
- CSV export (Phase 4)
- PDF reports (v2)
- Push notifications (v2)
- Social login (v2)