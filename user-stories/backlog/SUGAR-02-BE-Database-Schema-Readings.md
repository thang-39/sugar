# SUGAR-02-BE-Database-Schema-Readings

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Backend |
| **User Stories (PRD)** | Supports US-1, US-2, US-3, US-4, US-5, US-6, US-7, US-8, US-9, US-10, US-11 |
| **Status** | Not started |
| **Blocked by** | SUGAR-01-BE-Supabase-Setup |

---

## Context

The `readings` table in Supabase is the server-side copy of what WatermelonDB stores locally on the device. Both schemas must match exactly so that when sync is implemented, data moves between device and server without transformation errors.

All blood sugar values in Supabase are stored in **mg/dL** — the frontend handles conversion to/from the user's preferred unit (mmol/L) before sending or after receiving.

---

## User Story

> As a **backend system**, I want to store blood sugar readings in a structured database so that user data can be synced from their device and preserved in the cloud.

---

## Acceptance Criteria

### AC-1: `readings` table created

- Table name: `public.readings`
- Created via Supabase **SQL Editor**
- All columns exist with the correct types:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | Server-generated UUID |
| `user_id` | `uuid` | NULLABLE, references `auth.users(id)` | `null` = guest mode readings (local-only) |
| `value` | `integer` | NOT NULL | Always mg/dL |
| `meal_type` | `text` | NOT NULL | `Breakfast` \| `Lunch` \| `Dinner` \| `Snack` |
| `meal_timing` | `text` | NOT NULL | `Before` \| `After` |
| `hours_after_meal` | `integer` | NULLABLE | 0–6; `null` when `meal_timing = 'Before'` |
| `notes` | `text` | NULLABLE | Max 500 chars |
| `recorded_at` | `bigint` | NOT NULL | Unix **millisecond** timestamp (when reading was taken, user-editable) |
| `created_at` | `bigint` | NOT NULL | Unix ms (when row was created) |
| `updated_at` | `bigint` | NOT NULL | Unix ms (bumped on every edit) |
| `sync_status` | `text` | NOT NULL, default `pending` | `synced` \| `pending` \| `conflict` |

### AC-2: Indexes created

- `readings_user_id_idx` on `user_id` — for fetching a user's readings
- `readings_recorded_at_idx` on `recorded_at` — for sorting and date range queries
- `readings_sync_status_idx` on `sync_status` — for sync queue queries

### AC-3: Data integrity note documented

- The 60-second duplicate detection window (for server-wins conflict resolution) is **not enforced at the DB level** — it is handled in the sync engine on the frontend (Phase 5)
- A comment in the SQL explains this decision for future reference

### AC-4: Timestamp convention

- All timestamps stored as `bigint` (Unix milliseconds), not `timestamp` or `timestamptz`
- Rationale: avoids timezone ambiguity; consistent with WatermelonDB (which uses JS `Date` / Unix ms)

---

## Definition of Done

- [ ] `public.readings` table exists in Supabase with all 11 columns
- [ ] All 3 indexes created
- [ ] A test row can be inserted via SQL Editor and appears in Table Editor
- [ ] Test row can be deleted
- [ ] `docs/API.md` references the `readings` table shape

---

## Notes

- `bigint` type in PostgreSQL maps to `number` in JS — no precision issues for Unix timestamps
- `value` is always `integer` (whole numbers) per PRD validation: "whole numbers only"
- Server-generated UUID (`gen_random_uuid()`) is used as primary key, but the frontend also generates client UUIDs — both are fine as long as the sync engine handles deduplication