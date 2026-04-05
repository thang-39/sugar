# US-FE-06 — Domain Models & Use Cases

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 1: Log a blood sugar reading
- US 5: Add optional free-text notes
- US 6: Edit a reading
- US 7: Delete a reading

## Goal
Implement the domain layer: plain TypeScript interfaces (models) and pure business logic (use cases). No React components, no WatermelonDB imports — just functions that can be easily tested.

---

## Steps

### 1. Define Reading Model

**`src/domain/models/Reading.ts`**

```ts
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type MealTiming = 'Before' | 'After';
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export interface Reading {
  id: string;
  userId: string | null;        // null = guest
  value: number;                // mg/dL (always)
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal: number | null; // 0–6, null if Before
  notes: string | null;         // max 500 chars
  recordedAt: number;           // Unix ms timestamp
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface ReadingInput {
  value: number;
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal?: number | null;
  notes?: string | null;
  recordedAt: number;
}
```

**`src/domain/models/AppSettings.ts`**

```ts
export type PreferredUnit = 'mg/dL' | 'mmol/L';

export interface AppSettings {
  preferredUnit: PreferredUnit;
  fastingRange: { min: number; max: number };   // Phase 4
  postMealRange: { min: number; max: number };  // Phase 4
  alertsEnabled: boolean;                        // Phase 4
}
```

### 2. ValidateReading Use Case

**`src/domain/useCases/ValidateReading.ts`**

```ts
import { MealTiming } from '../models/Reading';

export interface ValidationResult {
  valid: boolean;
  warning?: string; // "This reading is outside normal ranges. Save anyway?"
}

const NORMAL_MIN = 20;  // mg/dL
const NORMAL_MAX = 600; // mg/dL

export function validateReading(
  value: number,
  mealTiming: MealTiming
): ValidationResult {
  // Must be a whole number (integer)
  if (!Number.isInteger(value)) {
    return {
      valid: false,
      warning: 'Blood sugar value must be a whole number.',
    };
  }

  // Must be within normal range
  if (value < NORMAL_MIN || value > NORMAL_MAX) {
    return {
      valid: true, // warn-only, not a hard error
      warning: 'This reading is outside normal ranges (20–600 mg/dL). Save anyway?',
    };
  }

  return { valid: true };
}
```

### 3. CreateReading Use Case

**`src/domain/useCases/CreateReading.ts`**

```ts
import { Reading, ReadingInput } from '../models/Reading';
import { v4 as uuidv4 } from 'uuid';

export interface CreateReadingDeps {
  saveToDb: (reading: Reading) => Promise<void>;
}

export function createReading(
  input: ReadingInput,
  userId: string | null,
  deps: CreateReadingDeps
): Reading {
  const now = Date.now();

  const reading: Reading = {
    id: uuidv4(),
    userId,
    value: input.value,
    mealType: input.mealType,
    mealTiming: input.mealTiming,
    hoursAfterMeal: input.hoursAfterMeal ?? null,
    notes: input.notes ?? null,
    recordedAt: input.recordedAt,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending', // always pending in guest mode
  };

  return reading;
}

// Note: the actual DB write is done by the repository (US-FE-08).
// This use case only builds the domain object.
```

### 4. EditReading Use Case

**`src/domain/useCases/EditReading.ts`**

```ts
import { Reading, ReadingInput } from '../models/Reading';

export function buildUpdatedReading(
  existing: Reading,
  input: Partial<ReadingInput>
): Reading {
  return {
    ...existing,
    value: input.value ?? existing.value,
    mealType: input.mealType ?? existing.mealType,
    mealTiming: input.mealTiming ?? existing.mealTiming,
    hoursAfterMeal: input.hoursAfterMeal ?? existing.hoursAfterMeal,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    recordedAt: input.recordedAt ?? existing.recordedAt,
    updatedAt: Date.now(),
    syncStatus: 'pending', // mark for re-sync
  };
}
```

### 5. DeleteReading Use Case

**`src/domain/useCases/DeleteReading.ts`**

```ts
export function canDelete(readingId: string): boolean {
  // In Phase 1: any reading can be deleted (no ownership check needed in guest mode)
  return readingId.length > 0;
}
```

### 6. GetReadings Use Case

**`src/domain/useCases/GetReadings.ts`**

```ts
export interface DateRange {
  start: number; // Unix ms
  end: number;    // Unix ms
}

export function filterByDateRange<T extends { recordedAt: number }>(
  readings: T[],
  range: DateRange | null
): T[] {
  if (!range) return readings;
  return readings.filter(r => r.recordedAt >= range.start && r.recordedAt <= range.end);
}

export function sortNewestFirst<T extends { recordedAt: number }>(readings: T[]): T[] {
  return [...readings].sort((a, b) => b.recordedAt - a.recordedAt);
}
```

### 7. ConvertUnit Use Case

**`src/domain/useCases/ConvertUnit.ts`**

```ts
const MGDL_TO_MMOLL_FACTOR = 0.0555;

export type PreferredUnit = 'mg/dL' | 'mmol/L';

/**
 * Convert mg/dL → mmol/L
 * Display format: 1 decimal place
 */
export function mgdlToMmoll(mgdl: number): number {
  return Math.round(mgdl * MGDL_TO_MMOLL_FACTOR * 10) / 10;
}

/**
 * Convert mmol/L → mg/dL
 * Used when user enters a value in mmol/L
 */
export function mmollToMgdl(mmoll: number): number {
  return Math.round(mmoll / MGDL_TO_MMOLL_FACTOR);
}

/**
 * Convert a stored value (mg/dL) to the user's preferred display unit
 */
export function toDisplayUnit(
  mgdlValue: number,
  preferredUnit: PreferredUnit
): number {
  return preferredUnit === 'mmol/L' ? mgdlToMmoll(mgdlValue) : mgdlValue;
}

/**
 * Convert a user-entered value (in their preferred unit) to mg/dL for storage
 */
export function fromDisplayUnit(
  displayValue: number,
  preferredUnit: PreferredUnit
): number {
  return preferredUnit === 'mmol/L' ? mmollToMgdl(displayValue) : displayValue;
}
```

### 8. Update Shell Files

Replace all empty shells in `src/domain/models/` and `src/domain/useCases/` with the code above.

---

## Verification

- [ ] `validateReading(95, 'Before')` returns `{ valid: true }`
- [ ] `validateReading(5, 'Before')` returns `{ valid: true, warning: '...' }` (out of range)
- [ ] `validateReading(95.5, 'Before')` returns `{ valid: false }` (not a whole number)
- [ ] `mgdlToMmoll(100)` returns `5.6` (approx)
- [ ] `mmollToMgdl(5.6)` returns approximately `101`
- [ ] `toDisplayUnit(100, 'mg/dL')` returns `100`
- [ ] `toDisplayUnit(100, 'mmol/L')` returns `5.6`
- [ ] `fromDisplayUnit(5.6, 'mmol/L')` returns approximately `101`

---

## Dependencies
- **US-FE-02** (folder structure) must be complete first.
- **US-FE-05** (Zustand store) is a soft dependency — `userId` is passed as a param so no hard dependency.