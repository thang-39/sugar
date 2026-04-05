# SUGAR-03-BE-Database-Schema-AppSettings

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Backend |
| **User Stories (PRD)** | Supports US-43 (unit preference), US-47 (onboarding), indirect for all settings |
| **Status** | Not started |
| **Blocked by** | SUGAR-01-BE-Supabase-Setup |

---

## Context

User preferences and app metadata need to be stored in the cloud so they sync across devices when the user logs in. The `app_settings` table is a simple key-value store — one row per setting key, per user.

In Phase 1, settings are stored locally in WatermelonDB only. The Supabase copy is created now so it is ready for Phase 5 (Account & Sync).

---

## User Story

> As a **backend system**, I want to store user preferences (unit, target ranges, sync metadata) in a key-value table so that settings can be synced across devices when the user logs in.

---

## Acceptance Criteria

### AC-1: `app_settings` table created

- Table name: `public.app_settings`
- Created via Supabase **SQL Editor**
- All columns:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PRIMARY KEY, default `gen_random_uuid()` | |
| `user_id` | `uuid` | NULLABLE | `null` = guest (local-only settings) |
| `key` | `text` | NOT NULL | Setting key name |
| `value` | `text` | NOT NULL | JSON-serialized string |
| `updated_at` | `bigint` | NOT NULL | Unix ms timestamp |

### AC-2: Unique constraint on (user_id, key)

- A user can only have one value per key — no duplicate rows for the same setting
- Implemented as a `unique` constraint in SQL

### AC-3: Index created

- `app_settings_user_key_idx` on `(user_id, key)` — for fast lookups when syncing

### AC-4: Settings keys documented

The following keys are used in Phase 1 (Phase 4+ adds more):

| Key | Value Type | Description |
|---|---|---|
| `preferredUnit` | `"mg/dL"` or `"mmol/L"` | User's preferred blood sugar unit |
| `lastSyncedAt` | Unix ms timestamp | When sync last completed |

---

## Definition of Done

- [ ] `public.app_settings` table exists in Supabase
- [ ] Unique constraint on `(user_id, key)` enforced
- [ ] Index on `(user_id, key)` created
- [ ] Test insert and retrieve works via SQL Editor
- [ ] `docs/API.md` updated to reference `app_settings`

---

## Notes

- Value is always stored as a JSON-serialized string (e.g. `"\"mg/dL\""` for a string, `"100"` for a number)
- This avoids needing a separate column per setting type