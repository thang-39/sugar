# Phase 1 — Scaffold + Core Logging (Guest Mode)

> **PRD:** `/home/thang/Works/sugar/PRD.md`
> **Parent plan:** `/home/thang/Works/sugar/plans/blood-sugar-tracker.md`

## User Stories Covered

| # | Story |
|---|---|
| 1 | Log a blood sugar reading with current date/time |
| 2 | Tag a reading with a meal type |
| 3 | Specify before or after a meal |
| 4 | Specify hours after a meal |
| 5 | Add optional free-text notes (max 500 chars) |
| 6 | Edit a previously logged reading |
| 7 | Delete a reading |
| 8 | See a confirmation after saving |
| 9 | Use the app without creating an account (guest mode) |
| 10 | Data stored only on device |
| 11 | Data persists across app restarts |
| 47 | Brief onboarding flow |
| 48 | Skip onboarding and go straight to guest mode |
| 49 | Handle offline mode gracefully |
| 50 | Reading saved locally even if sync fails |
| 51 | Reading queued for sync when offline |
| 52 | Screen reader support and proper contrast |

---

## Files

### Backend (BE)

| File | Task |
|---|---|
| `US-BE-01-supabase-setup.md` | Create Supabase project + get credentials |
| `US-BE-02-db-schema-readings.md` | Create `readings` table in Supabase |
| `US-BE-03-db-schema-app-settings.md` | Create `app_settings` table in Supabase |
| `US-BE-04-rls-policies.md` | Configure permissive RLS policies |
| `US-BE-05-api-docs.md` | Document the REST API shape |

### Frontend (FE)

| File | Task |
|---|---|
| `US-FE-01-project-scaffold.md` | React Native init + install all dependencies |
| `US-FE-02-clean-architecture-folders.md` | Create folder structure + shell files |
| `US-FE-03-watermelondb-schema-models.md` | WatermelonDB schema + model classes |
| `US-FE-04-database-singleton.md` | DB singleton (`database/index.ts`) |
| `US-FE-05-zustand-store.md` | Zustand store persisted to AsyncStorage |
| `US-FE-06-domain-layer.md` | Domain models + use cases (Validate, Create, Edit, Delete, Get, Convert) |
| `US-FE-07-utils-unit-date.md` | Unit conversion + date formatting utilities |
| `US-FE-08-repositories.md` | ReadingRepository + AppSettingsRepository |
| `US-FE-09-onboarding-screen.md` | Onboarding screen + navigation wiring |
| `US-FE-10-navigation-setup.md` | Bottom tabs + per-tab stack navigators |
| `US-FE-11-log-reading-screen.md` | Core Log Reading form |
| `US-FE-12-history-list-screen.md` | History list with date filter |
| `US-FE-13-detail-edit-screens.md` | Detail screen + Edit screen |
| `US-FE-14-trends-screen.md` | Line chart with time scale picker |
| `US-FE-15-settings-screen.md` | Settings, About, Export placeholder, Account placeholder |
| `US-FE-16-offline-sync-stub.md` | NetInfo listener + sync engine stub |
| `US-FE-17-accessibility.md` | Accessibility pass (labels, contrast, touch targets) |
| `US-FE-18-sync-status-indicator.md` | Header sync icon + popover |

---

## Recommended Implementation Order

```
BE: BE-01 → BE-02 → BE-03 → BE-04 → BE-05

FE: FE-01 → FE-02 → FE-03 → FE-04 → FE-05
        → FE-06 → FE-07 → FE-08
        → FE-09 → FE-10
        → FE-11 → FE-12 → FE-13 → FE-14
        → FE-15
        → FE-16
        → FE-17
        → FE-18
```

**Key dependency notes:**
- FE-01 must complete before everything else (no deps)
- FE-02 depends on FE-01
- FE-03/04/05 depend on FE-02
- FE-06 depends on FE-02
- FE-07 depends on FE-02
- FE-08 depends on FE-04 and FE-06
- FE-09 depends on FE-05 and FE-02
- FE-10 depends on FE-09
- FE-11 depends on FE-08, FE-05, FE-06
- FE-12 depends on FE-11 and FE-08
- FE-13 depends on FE-11 and FE-12
- FE-14 depends on FE-11
- FE-15 depends on FE-10
- FE-16 depends on FE-08 and FE-05
- FE-17 depends on all screens being built
- FE-18 depends on FE-16

---

## Integration Checklist

See `INTEGRATION.md` for the end-to-end test checklist to run after completing all tasks.
