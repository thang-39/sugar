# SUGAR-08-FE-WatermelonDB-Schema-Models

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-9, US-10, US-11 (local data persistence) |
| **Status** | Not started |
| **Blocked by** | SUGAR-07-FE-Clean-Architecture-Folder-Structure |

---

## Context

WatermelonDB is the local SQLite database on the device. Its schema must match the Supabase `readings` and `app_settings` tables exactly (same column names, types, and constraints) so that data syncs correctly without transformation in Phase 5.

This user story defines the schema and the TypeScript model classes.

---

## User Story

> As a **user**, I want my readings to be saved on my phone and stay there even when the app is closed or my phone restarts — so my data is never lost.

---

## Acceptance Criteria

### AC-1: Schema defined in `src/data/database/schema.ts`

- Uses `appSchema()` and `tableSchema()` from `@nozbe/watermelondb`
- Schema version: `1`
- `readings` table has all columns matching Supabase exactly:

| Column | Type | Indexed? |
|---|---|---|
| `id` | `string` (PK) | — |
| `user_id` | `string` (optional) | — |
| `value` | `number` | — |
| `meal_type` | `string` | — |
| `meal_timing` | `string` | — |
| `hours_after_meal` | `number` (optional) | — |
| `notes` | `string` (optional) | — |
| `recorded_at` | `number` | — |
| `created_at` | `number` | — |
| `updated_at` | `number` | — |
| `sync_status` | `string` | ✅ |

- `app_settings` table has all columns matching Supabase exactly:

| Column | Type | Indexed? |
|---|---|---|
| `id` | `string` (PK) | — |
| `user_id` | `string` (optional) | — |
| `key` | `string` | ✅ |
| `value` | `string` | — |
| `updated_at` | `number` | — |

### AC-2: `ReadingModel` class defined

- Extends `Model` from `@nozbe/watermelondb`
- Decorators used: `@field`, `@text`, `@writer`
- Exposes: `id`, `userId`, `value`, `mealType`, `mealTiming`, `hoursAfterMeal`, `notes`, `recordedAt`, `createdAt`, `updatedAt`, `syncStatus`
- Has a `markPending()` writer method that sets `syncStatus = 'pending'` and bumps `updatedAt`

### AC-3: `AppSettingModel` class defined

- Extends `Model` from `@nozbe/watermelondb`
- Decorators used: `@field`, `@text`
- Exposes: `id`, `userId`, `key`, `value`, `updatedAt`

### AC-4: Type exports

- `MealType` type: `'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'`
- `MealTiming` type: `'Before' | 'After'`
- `SyncStatus` type: `'synced' | 'pending' | 'conflict'`

### AC-5: Indexes defined

- `sync_status` on `readings` — for sync queue queries
- `key` on `app_settings` — for fast setting lookups

### AC-6: Schema version matches

- Schema version `1` matches the initial migration

---

## Definition of Done

- [ ] `schema.ts` has `readings` and `app_settings` tables with all columns
- [ ] `ReadingModel` class exists with all fields
- [ ] `AppSettingModel` class exists with all fields
- [ ] Type enums (`MealType`, `MealTiming`, `SyncStatus`) exported
- [ ] `sync_status` column is indexed
- [ ] Babel decorators plugin is configured (otherwise models won't compile)

---

## Notes

- WatermelonDB column names use `snake_case` (matching Supabase); TypeScript model properties use `camelCase`
- `@text` decorator for strings, `@field` for numbers — this affects how data is serialized
- WatermelonDB timestamps are stored as Unix **milliseconds** (not seconds) — consistent with Supabase
- The `@writer` decorator creates an async method that runs inside a WatermelonDB write transaction