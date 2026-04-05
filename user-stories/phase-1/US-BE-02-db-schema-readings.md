# US-BE-02 — Supabase: `readings` Table Schema

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Backend**

## User Story (from PRD)
_(Internal DB setup — no direct user story. Supports US 1–8, 9–11, 50, 51.)_

## Goal
Create the `readings` table in Supabase that mirrors the WatermelonDB local schema exactly. All blood sugar values are stored in **mg/dL** internally.

---

## Steps

### 1. Open Supabase SQL Editor
- Dashboard → **SQL Editor** → **New Query**

### 2. Run the Following SQL

```sql
-- ============================================================
-- readings table
-- All blood sugar values stored in mg/dL (converted by FE)
-- ============================================================

create table if not exists public.readings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,                            -- null = guest (local-only)
  value            integer not null,                -- mg/dL, whole numbers only
  meal_type        text not null,                   -- Breakfast | Lunch | Dinner | Snack
  meal_timing      text not null,                   -- Before | After
  hours_after_meal integer,                         -- 0–6, nullable
  notes            text,                            -- max 500 chars, nullable
  recorded_at      bigint not null,                 -- Unix ms timestamp (when reading was taken)
  created_at       bigint not null,                 -- Unix ms timestamp (when entry was created)
  updated_at       bigint not null,                 -- Unix ms timestamp (last edit)
  sync_status      text not null default 'pending' -- synced | pending | conflict
);

-- ============================================================
-- Indexes for sync queries
-- ============================================================

create index if not exists readings_user_id_idx
  on public.readings(user_id);

create index if not exists readings_recorded_at_idx
  on public.readings(recorded_at);

create index if not exists readings_sync_status_idx
  on public.readings(sync_status);

-- ============================================================
-- Deduplication constraint
-- Same user + recordedAt within 60-second window → server wins
-- ============================================================

-- Note: exact-match unique constraint on user_id + recorded_at
-- The 60-second window is enforced in the sync engine (Phase 5),
-- not at the DB level, to allow slight clock drift between devices.
```

---

## Column Reference

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Server-generated UUID (FE also generates client UUIDs) |
| `user_id` | `uuid` | Links to `auth.users(id)`. `null` for guest readings (local only). |
| `value` | `integer` | **Always mg/dL.** FE converts from user's preferred unit before sending. |
| `meal_type` | `text` | Enum: `Breakfast`, `Lunch`, `Dinner`, `Snack` |
| `meal_timing` | `text` | Enum: `Before`, `After` |
| `hours_after_meal` | `integer` | `0–6`. `null` when `mealTiming = 'Before'`. |
| `notes` | `text` | Max 500 chars. Nullable. |
| `recorded_at` | `bigint` | Unix **millisecond** timestamp — when the reading was taken (not when it was saved). |
| `created_at` | `bigint` | Unix ms timestamp — when the row was first created. |
| `updated_at` | `bigint` | Unix ms timestamp — bumped on every edit. |
| `sync_status` | `text` | `synced` / `pending` / `conflict`. Managed by sync engine. |

---

## Verification

- [ ] Table `public.readings` exists in Supabase SQL Editor
- [ ] All 11 columns are present with correct types
- [ ] 3 indexes created (user_id, recorded_at, sync_status)
- [ ] Insert a test row via SQL Editor → appears in Table Editor
- [ ] Delete the test row

---

## Dependencies
- **US-BE-01** must be complete first.
