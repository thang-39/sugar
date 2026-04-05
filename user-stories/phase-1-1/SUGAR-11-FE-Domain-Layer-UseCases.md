# SUGAR-11-FE-Domain-Layer-UseCases

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-1 (log reading), US-5 (notes), US-6 (edit), US-7 (delete), US-43 (unit) |
| **Status** | Not started |
| **Blocked by** | SUGAR-07-FE-Clean-Architecture-Folder-Structure |

---

## Context

The domain layer contains **pure business logic** with no React, WatermelonDB, or Supabase dependencies. This is what makes the app testable — all business rules can be unit tested without a running app or database.

The domain layer lives in `src/domain/`. Models are plain TypeScript interfaces. Use cases are plain functions that take inputs and return outputs.

---

## User Story

> As a **user**, I want the app to validate my readings, warn me when a value seems unusual, and automatically handle unit conversions — so I don't have to think about the math and my data is always stored consistently.

> As a **developer**, I want all validation rules, conversion rules, and business rules expressed as pure functions so that they are easy to understand, test, and modify without touching the UI or database.

---

## Acceptance Criteria

### AC-1: `Reading` and `ReadingInput` domain models

- `src/domain/models/Reading.ts` exports:
  - `interface Reading` — all fields
  - `interface ReadingInput` — fields needed to create/edit (no id, timestamps, syncStatus — those are assigned by the system)
  - `type MealType` — `'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'`
  - `type MealTiming` — `'Before' | 'After'`
  - `type SyncStatus` — `'synced' | 'pending' | 'conflict'`

### AC-2: `ValidateReading` use case

Input: `value: number` (mg/dL), `mealTiming: MealTiming`
Output: `{ valid: boolean; warning?: string }`

Rules:
- Value must be a whole number (integer)
- Value must be 20–600 mg/dL
- If value is outside 20–600: return `valid: true` with a `warning` (warn-only, not a hard error — user can still save)
- If value is invalid (NaN, non-integer): return `valid: false`

### AC-3: `CreateReading` use case

Input: `ReadingInput`, `userId: string | null`
Output: `Reading` (domain object, not a DB model)

Behavior:
- Generates a UUID for `id`
- Sets `userId` from input
- Sets `syncStatus: 'pending'`
- Sets `createdAt` and `updatedAt` to `Date.now()`
- Converts `hoursAfterMeal` to `null` if `mealTiming === 'Before'`
- Converts empty `notes` to `null`

### AC-4: `EditReading` use case

Input: `existing: Reading`, `updates: Partial<ReadingInput>`
Output: `Reading` (new object, not mutating the existing one)

Behavior:
- Returns a new `Reading` object with updated fields merged in
- Bumps `updatedAt` to `Date.now()`
- Sets `syncStatus: 'pending'` (must re-sync after edit)
- `recordedAt` is editable — included in updates

### AC-5: `ConvertUnit` use case

Functions (from `src/utils/unitConversion.ts`):

- `mgdlToMmoll(mgdl: number): number` — rounds to 1 decimal place
- `mmollToMgdl(mmoll: number): number` — rounds to whole number
- `toDisplayValue(mgdlValue, preferredUnit)` — converts to user's unit for display
- `fromDisplayValue(displayValue, preferredUnit)` — converts user input to mg/dL for storage
- Conversion factor: `0.0555`

### AC-6: Date filter helper

Input: `readings: Reading[]`, `range: { start: number; end: number } | null`
Output: filtered `readings[]`

Behavior:
- If `range` is `null`, returns all readings
- If `range` is set, returns only readings where `recordedAt >= start AND recordedAt <= end`
- Sorted: newest first (by `recordedAt` DESC)

### AC-7: No framework imports

- `src/domain/` files import **no** packages from `react-native`, `@nozbe/watermelondb`, `@supabase/supabase-js`, `zustand`, or `react-navigation`
- All dependencies are plain TypeScript

---

## Definition of Done

- [ ] `Reading` and `ReadingInput` interfaces exported
- [ ] `ValidateReading` returns correct results for all edge cases (normal, out-of-range, non-integer)
- [ ] `CreateReading` produces a valid `Reading` object with correct defaults
- [ ] `EditReading` produces a new object with merged updates
- [ ] Unit conversion is accurate (verified by tests)
- [ ] Date filter works correctly
- [ ] No framework imports in `src/domain/`

---

## Notes

- The domain layer is the most important layer to keep clean — it is the "business brain" of the app
- Use cases should be small, single-purpose functions (not big classes)
- The domain layer is where PRD rules live — if a rule changes, it should only change here
