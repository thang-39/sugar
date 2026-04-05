# US-BE-03 — Supabase: `app_settings` Table Schema

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Backend**

## User Story (from PRD)
_(Internal DB setup — no direct user story. Required for US 43, 46, 72.)_

## Goal
Create the `app_settings` key-value table in Supabase for storing user preferences and sync metadata.

---

## Steps

### 1. Open Supabase SQL Editor
- Dashboard → **SQL Editor** → **New Query**

### 2. Run the Following SQL

```sql
-- ============================================================
-- app_settings table
-- Key-value store for user preferences and sync metadata
-- ============================================================

create table if not exists public.app_settings (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,                            -- null = guest
  key        text not null,                   -- setting key name
  value      text not null,                   -- JSON-serialized string
  updated_at bigint not null,                 -- Unix ms timestamp

  unique (user_id, key)                       -- one value per key per user
);

-- ============================================================
-- Index for fast lookups
-- ============================================================

create index if not exists app_settings_user_key_idx
  on public.app_settings(user_id, key);
```

---

## Settings Keys Used in Phase 1

| Key | Value Type | Description |
|---|---|---|
| `preferredUnit` | `"mg/dL"` or `"mmol/L"` | User's blood sugar unit preference |
| `lastSyncedAt` | Unix ms timestamp | When sync last completed |

Additional keys (Phase 4+): `fastingRange`, `postMealRange`, `alertsEnabled`.

---

## Verification

- [ ] Table `public.app_settings` exists in Supabase SQL Editor
- [ ] Unique constraint on `(user_id, key)` is present
- [ ] Index on `(user_id, key)` is present
- [ ] Insert a test row via SQL Editor → appears in Table Editor
- [ ] Delete the test row

---

## Dependencies
- **US-BE-01** must be complete first.
