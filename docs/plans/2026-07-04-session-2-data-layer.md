# Session 2 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fully-tested data + domain layer for Sugar — Drizzle schema, repositories, unit conversion, validation, target-range evaluation, and reading CRUD use cases — with **no UI**.

**Architecture:** Clean Architecture. `src/domain` is pure TypeScript (no React/Expo/data imports): models, use cases, and repository **ports** (interfaces). `src/data` implements those ports against Drizzle + SQLite. Use cases receive dependencies (repository, id generator, clock) by injection so they are deterministic and testable. Production uses `expo-sqlite`; tests use `better-sqlite3` in-memory — both drive the identical Drizzle sync query API.

**Tech Stack:** TypeScript (strict + `noUncheckedIndexedAccess`), Drizzle ORM (`drizzle-orm/sqlite-core`), expo-sqlite (prod) / better-sqlite3 (test), Jest + jest-expo, drizzle-kit for migrations.

---

## Key decisions & flagged conflicts

1. **Repository ports live in `src/domain/repositories/`, sqlite adapters in `src/data/repositories/`.** The hard layering rule ("Domain layer imports nothing from React, Expo, or data") means the port a use case depends on **must** be in `src/domain`. This ports-and-adapters split is now the documented convention in CLAUDE.md (updated during Session 2 planning — previously the structure comment placed the interface under `src/data/`).
2. **In-memory SQLite = `better-sqlite3`.** `expo-sqlite` is a native module and cannot run in Node/Jest. `better-sqlite3` (sync SQLite for Node) drives the same Drizzle sync API. The schema is driver-agnostic (`sqlite-core`); only the client wiring differs. One `as unknown as SugarDb` cast is confined to the test-db helper.
3. **Timestamps are Unix milliseconds** (`Date.now()`), stored as SQLite integers. PRD says "Unix timestamps"; ms chosen for JS-native precision and consistency.
4. **Use cases inject `generateId` and `now`.** Keeps `src/domain` pure (no `expo-crypto`, no `Date.now()` inside domain) and tests deterministic. Production adapters live in `src/data`.
5. **Two commits this session** (matching PLAN.md): `chore: remove unused template assets` (carried-over follow-up) then `feat: data layer — schema, repositories, reading use cases`. Per-task commits are intentionally skipped in favor of the project's PLAN.md commit convention.

## File structure produced by this plan

```
babel.config.js                                  # NEW — babel-preset-expo (needed by jest-expo)
jest.config.js                                   # NEW — jest-expo preset, node env, @/ mapper
metro.config.js                                  # NEW — .sql source ext (for runtime migrations, Session 3)
drizzle.config.ts                                # NEW — drizzle-kit config (sqlite, expo driver)
drizzle/                                         # GENERATED — 0000_*.sql, meta/_journal.json, migrations.js
src/domain/
  models/
    unit.ts            meal.ts        reading.ts
    target-range.ts    settings.ts
  repositories/
    reading-repository.ts       settings-repository.ts     # PORTS (interfaces)
  use-cases/
    convert-unit.ts             validate-reading-value.ts
    evaluate-reading.ts         reading-use-case-deps.ts
    create-reading.ts           update-reading.ts           delete-reading.ts
    __tests__/                                              # *.test.ts for the above
src/data/
  db/
    schema.ts          database.ts    client.ts             # client.ts = prod expo-sqlite (not test-reached)
  repositories/
    sqlite-reading-repository.ts       sqlite-settings-repository.ts
    __tests__/                                              # *.test.ts (in-memory)
  id.ts                                                     # prod generateId (expo-crypto)
src/test-support/
  test-db.ts                                                # createTestDb() — better-sqlite3 in-memory
```

---

## Task 1: Tooling — Jest, drizzle-kit, better-sqlite3, babel/jest/metro config

**Files:**
- Create: `babel.config.js`, `jest.config.js`, `metro.config.js`, `drizzle.config.ts`
- Modify: `package.json` (devDependencies + `test` script)

- [ ] **Step 1: Install SDK-matched Expo test/native deps**

```bash
npx expo install expo-crypto jest-expo
```

- [ ] **Step 2: Install remaining dev tooling**

```bash
npm install --save-dev jest @types/jest better-sqlite3 @types/better-sqlite3 drizzle-kit
```

Expected: installs succeed. If npm prints a peer-dependency warning about `jest` vs `jest-expo`, align `jest` to the major `jest-expo@~57` expects (check `npm ls jest-expo`), then re-run `npm test` at the end — a warning alone is not a failure.

- [ ] **Step 3: Create `babel.config.js`** (jest-expo's transformer needs a babel config)

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

- [ ] **Step 4: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    // assets mapper MUST come before the general @/ mapper
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

- [ ] **Step 5: Create `metro.config.js`** (lets Session 3 import the generated `.sql` migration bundle at runtime)

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
```

- [ ] **Step 6: Create `drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/data/db/schema.ts',
  out: './drizzle',
});
```

- [ ] **Step 7: Add the `test` script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 8: Sanity-check Jest runs (no tests yet)**

Run: `npm test`
Expected: Jest starts and reports `No tests found` (exit non-zero is fine here) — this proves the preset/babel config loads without crashing. Do NOT proceed if it throws a config/transform error.

---

## Task 2: Domain models (types & constants — no business logic)

**Files:**
- Create: `src/domain/models/unit.ts`, `meal.ts`, `reading.ts`, `target-range.ts`, `settings.ts`

No tests — these are pure type/constant declarations verified by `tsc`.

- [ ] **Step 1: `src/domain/models/unit.ts`**

```ts
export const Unit = {
  MgDl: 'mg/dL',
  MmolL: 'mmol/L',
} as const;

export type Unit = (typeof Unit)[keyof typeof Unit];
```

- [ ] **Step 2: `src/domain/models/meal.ts`**

```ts
export const MealType = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Snack: 'Snack',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

export const MealTiming = {
  Before: 'Before',
  After: 'After',
} as const;
export type MealTiming = (typeof MealTiming)[keyof typeof MealTiming];
```

- [ ] **Step 3: `src/domain/models/reading.ts`**

```ts
import type { MealTiming, MealType } from './meal';

export const SyncStatus = {
  Synced: 'synced',
  Pending: 'pending',
  Conflict: 'conflict',
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

export interface Reading {
  id: string;
  userId?: string;
  value: number; // integer mg/dL (canonical storage)
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal?: number; // 0–6; only meaningful when mealTiming === 'After'
  notes?: string;
  recordedAt: number; // Unix ms — when the reading was taken (user-editable)
  createdAt: number; // Unix ms — row insertion (never edited)
  updatedAt: number; // Unix ms — last edit
  syncStatus: SyncStatus;
}
```

- [ ] **Step 4: `src/domain/models/target-range.ts`**

```ts
export interface TargetRange {
  low: number; // mg/dL, inclusive
  high: number; // mg/dL, inclusive
}

export interface TargetRanges {
  fasting: TargetRange; // used when mealTiming === 'Before'
  postMeal: TargetRange; // used when mealTiming === 'After'
}

export const RangeEvaluation = {
  InRange: 'in-range',
  Low: 'low',
  High: 'high',
} as const;
export type RangeEvaluation = (typeof RangeEvaluation)[keyof typeof RangeEvaluation];
```

- [ ] **Step 5: `src/domain/models/settings.ts`**

```ts
import type { TargetRange } from './target-range';
import { Unit } from './unit';

export const Language = {
  Vietnamese: 'vi',
  English: 'en',
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export interface AppSettings {
  preferredUnit: Unit;
  preferredLanguage: Language;
  fastingRange: TargetRange; // stored in mg/dL
  postMealRange: TargetRange; // stored in mg/dL
  alertsEnabled: boolean;
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  preferredUnit: Unit.MgDl,
  preferredLanguage: Language.Vietnamese,
  fastingRange: { low: 70, high: 100 },
  postMealRange: { low: 70, high: 140 },
  alertsEnabled: true,
  onboardingDone: false,
};
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

---

## Task 3: Unit conversion (TDD)

**Files:**
- Create: `src/domain/use-cases/convert-unit.ts`
- Test: `src/domain/use-cases/__tests__/convert-unit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { mgdlToMmol, mmolToMgdl } from '@/domain/use-cases/convert-unit';

describe('convert-unit', () => {
  describe('mgdlToMmol (display, 1 decimal)', () => {
    it.each([
      [20, 1.1],
      [126, 7],
      [180, 10],
      [200, 11.1],
      [600, 33.3],
    ])('converts %i mg/dL to %f mmol/L', (mgdl, mmol) => {
      expect(mgdlToMmol(mgdl)).toBe(mmol);
    });
  });

  describe('mmolToMgdl (input → nearest integer mg/dL)', () => {
    it.each([
      [1.1, 20],
      [5.6, 101],
      [7, 126],
      [10, 180],
      [33.3, 600],
    ])('converts %f mmol/L to %i mg/dL', (mmol, mgdl) => {
      expect(mmolToMgdl(mmol)).toBe(mgdl);
    });
  });

  describe('round-trip: typed mmol/L redisplays unchanged', () => {
    it.each([[1.1], [5.6], [7], [8.3], [10], [15], [20], [33.3]])(
      '%f mmol/L survives storage round-trip',
      (typed) => {
        expect(mgdlToMmol(mmolToMgdl(typed))).toBe(typed);
      },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- convert-unit`
Expected: FAIL — cannot find module `convert-unit` / functions not defined.

- [ ] **Step 3: Write minimal implementation**

```ts
export const MMOL_PER_MGDL = 0.0555;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Display conversion: stored integer mg/dL → mmol/L rounded to 1 decimal. */
export function mgdlToMmol(mgdl: number): number {
  return roundTo(mgdl * MMOL_PER_MGDL, 1);
}

/** Input conversion: typed mmol/L → nearest integer mg/dL for storage. */
export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol / MMOL_PER_MGDL);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- convert-unit`
Expected: PASS (all cases green).

---

## Task 4: Value validation (TDD)

**Files:**
- Create: `src/domain/use-cases/validate-reading-value.ts`
- Test: `src/domain/use-cases/__tests__/validate-reading-value.test.ts`

Rules (PRD "Input, Formatting & Locale Rules"): mg/dL = whole numbers; mmol/L = up to one decimal, `.` or `,` accepted. Values numeric but outside 20–600 mg/dL are **warn-only** (`withinNormalRange: false`), never rejected. Non-numeric / wrong-format input is rejected.

- [ ] **Step 1: Write the failing test**

```ts
import { validateReadingValue } from '@/domain/use-cases/validate-reading-value';
import { Unit } from '@/domain/models/unit';

describe('validateReadingValue', () => {
  describe('mg/dL', () => {
    it('accepts 20 as within normal range', () => {
      expect(validateReadingValue('20', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 20,
        withinNormalRange: true,
      });
    });

    it('accepts 600 as within normal range', () => {
      expect(validateReadingValue('600', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 600,
        withinNormalRange: true,
      });
    });

    it('accepts 19 but flags out-of-range (warn-only)', () => {
      expect(validateReadingValue('19', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 19,
        withinNormalRange: false,
      });
    });

    it('accepts 601 but flags out-of-range (warn-only)', () => {
      expect(validateReadingValue('601', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 601,
        withinNormalRange: false,
      });
    });

    it('rejects decimals in mg/dL', () => {
      expect(validateReadingValue('100.5', Unit.MgDl)).toEqual({
        ok: false,
        reason: 'not-integer',
      });
    });

    it('rejects empty and non-numeric', () => {
      expect(validateReadingValue('', Unit.MgDl)).toEqual({ ok: false, reason: 'empty' });
      expect(validateReadingValue('abc', Unit.MgDl)).toEqual({
        ok: false,
        reason: 'not-a-number',
      });
    });
  });

  describe('mmol/L', () => {
    it('accepts comma decimal separator', () => {
      expect(validateReadingValue('5,6', Unit.MmolL)).toEqual({
        ok: true,
        mgdl: 101,
        withinNormalRange: true,
      });
    });

    it('accepts dot decimal separator', () => {
      expect(validateReadingValue('5.6', Unit.MmolL)).toEqual({
        ok: true,
        mgdl: 101,
        withinNormalRange: true,
      });
    });

    it('rejects more than one decimal place', () => {
      expect(validateReadingValue('5.65', Unit.MmolL)).toEqual({
        ok: false,
        reason: 'too-precise',
      });
    });

    it('flags a low mmol value as out-of-range (warn-only)', () => {
      // 1.0 mmol/L -> 18 mg/dL (< 20)
      expect(validateReadingValue('1.0', Unit.MmolL)).toEqual({
        ok: true,
        mgdl: 18,
        withinNormalRange: false,
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- validate-reading-value`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { Unit } from '../models/unit';
import { mmolToMgdl } from './convert-unit';

export const MGDL_MIN = 20;
export const MGDL_MAX = 600;

export type ValueValidationError =
  | 'empty'
  | 'not-a-number'
  | 'not-integer' // mg/dL must be whole numbers
  | 'too-precise'; // mmol/L allows at most one decimal

export type ValueValidation =
  | { readonly ok: true; readonly mgdl: number; readonly withinNormalRange: boolean }
  | { readonly ok: false; readonly reason: ValueValidationError };

export function isWithinNormalRange(mgdl: number): boolean {
  return Number.isInteger(mgdl) && mgdl >= MGDL_MIN && mgdl <= MGDL_MAX;
}

/**
 * Parse and validate a raw value string in the given input unit.
 * Numeric-but-out-of-normal-range values are accepted with withinNormalRange=false (warn-only).
 */
export function validateReadingValue(raw: string, unit: Unit): ValueValidation {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, reason: 'empty' };

  if (unit === Unit.MgDl) {
    if (!/^\d+$/.test(trimmed)) {
      const looksNumeric = /^\d+([.,]\d+)?$/.test(trimmed);
      return { ok: false, reason: looksNumeric ? 'not-integer' : 'not-a-number' };
    }
    const mgdl = Number(trimmed);
    return { ok: true, mgdl, withinNormalRange: isWithinNormalRange(mgdl) };
  }

  // mmol/L: accept '.' or ',' as decimal separator; max one decimal place.
  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, reason: 'not-a-number' };
  }
  const decimals = normalized.split('.')[1];
  if (decimals !== undefined && decimals.length > 1) {
    return { ok: false, reason: 'too-precise' };
  }
  const mgdl = mmolToMgdl(Number(normalized));
  return { ok: true, mgdl, withinNormalRange: isWithinNormalRange(mgdl) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- validate-reading-value`
Expected: PASS.

---

## Task 5: Target-range evaluation (TDD)

**Files:**
- Create: `src/domain/use-cases/evaluate-reading.ts`
- Test: `src/domain/use-cases/__tests__/evaluate-reading.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { MealTiming } from '@/domain/models/meal';
import { RangeEvaluation, type TargetRanges } from '@/domain/models/target-range';

const ranges: TargetRanges = {
  fasting: { low: 70, high: 100 },
  postMeal: { low: 70, high: 140 },
};

describe('evaluateReading', () => {
  describe('Before → fasting range (70–100)', () => {
    it('flags low', () => {
      expect(evaluateReading({ value: 65, mealTiming: MealTiming.Before }, ranges)).toBe(
        RangeEvaluation.Low,
      );
    });
    it('flags in-range', () => {
      expect(evaluateReading({ value: 85, mealTiming: MealTiming.Before }, ranges)).toBe(
        RangeEvaluation.InRange,
      );
    });
    it('flags high', () => {
      expect(evaluateReading({ value: 110, mealTiming: MealTiming.Before }, ranges)).toBe(
        RangeEvaluation.High,
      );
    });
  });

  describe('After → post-meal range (70–140)', () => {
    it('treats 110 as in-range (would be high for fasting)', () => {
      expect(evaluateReading({ value: 110, mealTiming: MealTiming.After }, ranges)).toBe(
        RangeEvaluation.InRange,
      );
    });
    it('flags high above 140', () => {
      expect(evaluateReading({ value: 150, mealTiming: MealTiming.After }, ranges)).toBe(
        RangeEvaluation.High,
      );
    });
    it('flags low below 70', () => {
      expect(evaluateReading({ value: 60, mealTiming: MealTiming.After }, ranges)).toBe(
        RangeEvaluation.Low,
      );
    });
  });

  it('treats range bounds as inclusive', () => {
    expect(evaluateReading({ value: 70, mealTiming: MealTiming.Before }, ranges)).toBe(
      RangeEvaluation.InRange,
    );
    expect(evaluateReading({ value: 100, mealTiming: MealTiming.Before }, ranges)).toBe(
      RangeEvaluation.InRange,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- evaluate-reading`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRanges } from '../models/target-range';

/**
 * Evaluate a reading against target ranges, auto-selecting the range by meal timing.
 * All values are mg/dL; bounds are inclusive.
 */
export function evaluateReading(
  reading: Pick<Reading, 'value' | 'mealTiming'>,
  ranges: TargetRanges,
): RangeEvaluation {
  const range = reading.mealTiming === MealTiming.After ? ranges.postMeal : ranges.fasting;
  if (reading.value < range.low) return RangeEvaluation.Low;
  if (reading.value > range.high) return RangeEvaluation.High;
  return RangeEvaluation.InRange;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- evaluate-reading`
Expected: PASS.

---

## Task 6: Repository ports (domain interfaces — no logic)

**Files:**
- Create: `src/domain/repositories/reading-repository.ts`, `src/domain/repositories/settings-repository.ts`

No tests — interfaces verified by the implementations in Tasks 9–10.

- [ ] **Step 1: `src/domain/repositories/reading-repository.ts`**

```ts
import type { Reading } from '../models/reading';

export interface ReadingListFilter {
  from?: number; // inclusive: recordedAt >= from (Unix ms)
  to?: number; // inclusive: recordedAt <= to (Unix ms)
}

export interface ReadingRepository {
  create(reading: Reading): Promise<void>;
  update(reading: Reading): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Reading | undefined>;
  /** Newest-first by recordedAt. */
  list(filter?: ReadingListFilter): Promise<Reading[]>;
  count(filter?: ReadingListFilter): Promise<number>;
}
```

- [ ] **Step 2: `src/domain/repositories/settings-repository.ts`**

```ts
import type { AppSettings } from '../models/settings';

export interface SettingsRepository {
  get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]>;
  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 7: Reading use cases (TDD, against a fake repository)

**Files:**
- Create: `src/domain/use-cases/reading-use-case-deps.ts`, `create-reading.ts`, `update-reading.ts`, `delete-reading.ts`
- Test: `src/domain/use-cases/__tests__/reading-use-cases.test.ts`

- [ ] **Step 1: Write the failing test** (includes an in-test fake repo)

```ts
import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import type {
  ReadingListFilter,
  ReadingRepository,
} from '@/domain/repositories/reading-repository';
import { createReading } from '@/domain/use-cases/create-reading';
import { updateReading } from '@/domain/use-cases/update-reading';
import { deleteReading } from '@/domain/use-cases/delete-reading';
import type { ReadingUseCaseDeps } from '@/domain/use-cases/reading-use-case-deps';

class FakeReadingRepository implements ReadingRepository {
  readonly store = new Map<string, Reading>();
  async create(reading: Reading): Promise<void> {
    this.store.set(reading.id, { ...reading });
  }
  async update(reading: Reading): Promise<void> {
    this.store.set(reading.id, { ...reading });
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async getById(id: string): Promise<Reading | undefined> {
    const found = this.store.get(id);
    return found ? { ...found } : undefined;
  }
  async list(_filter?: ReadingListFilter): Promise<Reading[]> {
    return [...this.store.values()];
  }
  async count(_filter?: ReadingListFilter): Promise<number> {
    return this.store.size;
  }
}

function makeDeps(repository: ReadingRepository, now: number): ReadingUseCaseDeps {
  let counter = 0;
  return {
    repository,
    generateId: () => `id-${++counter}`,
    now: () => now,
  };
}

describe('createReading', () => {
  it('persists a reading with generated id, timestamps and pending sync', async () => {
    const repo = new FakeReadingRepository();
    const deps = makeDeps(repo, 1000);

    const reading = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      deps,
    );

    expect(reading).toEqual({
      id: 'id-1',
      value: 120,
      mealType: MealType.Lunch,
      mealTiming: MealTiming.Before,
      hoursAfterMeal: undefined,
      notes: undefined,
      recordedAt: 500,
      createdAt: 1000,
      updatedAt: 1000,
      syncStatus: SyncStatus.Pending,
    });
    expect(await repo.getById('id-1')).toEqual(reading);
  });

  it('drops hoursAfterMeal when timing is Before', async () => {
    const repo = new FakeReadingRepository();
    const reading = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        hoursAfterMeal: 2,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );
    expect(reading.hoursAfterMeal).toBeUndefined();
  });

  it('keeps hoursAfterMeal when timing is After', async () => {
    const repo = new FakeReadingRepository();
    const reading = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.After,
        hoursAfterMeal: 2,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );
    expect(reading.hoursAfterMeal).toBe(2);
  });
});

describe('updateReading', () => {
  it('updates fields and updatedAt, preserving createdAt', async () => {
    const repo = new FakeReadingRepository();
    const created = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );

    const updated = await updateReading(
      created.id,
      { value: 90 },
      makeDeps(repo, 2000),
    );

    expect(updated.value).toBe(90);
    expect(updated.createdAt).toBe(1000);
    expect(updated.updatedAt).toBe(2000);
    expect((await repo.getById(created.id))?.value).toBe(90);
  });

  it('throws when the reading does not exist', async () => {
    const repo = new FakeReadingRepository();
    await expect(
      updateReading('missing', { value: 90 }, makeDeps(repo, 2000)),
    ).rejects.toThrow('Reading not found: missing');
  });
});

describe('deleteReading', () => {
  it('removes the reading', async () => {
    const repo = new FakeReadingRepository();
    const created = await createReading(
      {
        value: 120,
        mealType: MealType.Lunch,
        mealTiming: MealTiming.Before,
        recordedAt: 500,
      },
      makeDeps(repo, 1000),
    );
    await deleteReading(created.id, { repository: repo });
    expect(await repo.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reading-use-cases`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/domain/use-cases/reading-use-case-deps.ts`**

```ts
import type { ReadingRepository } from '../repositories/reading-repository';

export interface ReadingUseCaseDeps {
  repository: ReadingRepository;
  generateId: () => string;
  now: () => number; // Unix ms
}
```

- [ ] **Step 4: Write `src/domain/use-cases/create-reading.ts`**

```ts
import { MealTiming, type MealType } from '../models/meal';
import { type Reading, SyncStatus } from '../models/reading';
import type { ReadingUseCaseDeps } from './reading-use-case-deps';

export interface CreateReadingInput {
  value: number; // integer mg/dL (already converted from the input unit)
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal?: number; // ignored unless mealTiming === 'After'
  notes?: string;
  recordedAt: number; // Unix ms
}

export async function createReading(
  input: CreateReadingInput,
  deps: ReadingUseCaseDeps,
): Promise<Reading> {
  const timestamp = deps.now();
  const reading: Reading = {
    id: deps.generateId(),
    value: input.value,
    mealType: input.mealType,
    mealTiming: input.mealTiming,
    hoursAfterMeal:
      input.mealTiming === MealTiming.After ? input.hoursAfterMeal : undefined,
    notes: input.notes,
    recordedAt: input.recordedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncStatus: SyncStatus.Pending,
  };
  await deps.repository.create(reading);
  return reading;
}
```

- [ ] **Step 5: Write `src/domain/use-cases/update-reading.ts`**

```ts
import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import type { ReadingUseCaseDeps } from './reading-use-case-deps';

export type UpdateReadingPatch = Partial<
  Pick<
    Reading,
    'value' | 'mealType' | 'mealTiming' | 'hoursAfterMeal' | 'notes' | 'recordedAt'
  >
>;

export async function updateReading(
  id: string,
  patch: UpdateReadingPatch,
  deps: ReadingUseCaseDeps,
): Promise<Reading> {
  const existing = await deps.repository.getById(id);
  if (existing === undefined) {
    throw new Error(`Reading not found: ${id}`);
  }
  const merged: Reading = {
    ...existing,
    ...patch,
    updatedAt: deps.now(),
  };
  // hoursAfterMeal is only meaningful when timing is After.
  merged.hoursAfterMeal =
    merged.mealTiming === MealTiming.After ? merged.hoursAfterMeal : undefined;
  await deps.repository.update(merged);
  return merged;
}
```

- [ ] **Step 6: Write `src/domain/use-cases/delete-reading.ts`**

```ts
import type { ReadingUseCaseDeps } from './reading-use-case-deps';

export async function deleteReading(
  id: string,
  deps: Pick<ReadingUseCaseDeps, 'repository'>,
): Promise<void> {
  await deps.repository.delete(id);
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- reading-use-cases`
Expected: PASS.

- [ ] **Step 8: Verify the domain layer is pure (no React/Expo/data imports)**

Run: `rg -n "from 'react|from 'expo|@/data|drizzle" src/domain`
Expected: **no matches**. (If any match appears, the layering rule is violated — fix before continuing.)

---

## Task 8: Drizzle schema, database type, migrations, prod client, test-db helper

**Files:**
- Create: `src/data/db/schema.ts`, `src/data/db/database.ts`, `src/data/db/client.ts`, `src/test-support/test-db.ts`
- Generate: `drizzle/` (via drizzle-kit)

- [ ] **Step 1: Write `src/data/db/schema.ts`**

```ts
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { MealTiming, MealType } from '@/domain/models/meal';
import type { SyncStatus } from '@/domain/models/reading';

export const readings = sqliteTable('readings', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  value: integer('value').notNull(),
  mealType: text('meal_type').$type<MealType>().notNull(),
  mealTiming: text('meal_timing').$type<MealTiming>().notNull(),
  hoursAfterMeal: integer('hours_after_meal'),
  notes: text('notes'),
  recordedAt: integer('recorded_at').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  syncStatus: text('sync_status').$type<SyncStatus>().notNull().default('pending'),
});

export const appSettings = sqliteTable(
  'app_settings',
  {
    id: text('id').primaryKey(), // = key
    key: text('key').notNull(),
    value: text('value').notNull(), // JSON-serialized value
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('app_settings_key_idx').on(table.key)],
);
```

- [ ] **Step 2: Write `src/data/db/database.ts`** (driver-agnostic DB type shared by prod + test)

```ts
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema';

/**
 * The Drizzle sync-SQLite database type used across the app. Both the
 * expo-sqlite (prod) and better-sqlite3 (test) drivers satisfy it — they share
 * the identical sync query API.
 */
export type SugarDb = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
```

- [ ] **Step 3: Write `src/data/db/client.ts`** (production; NOT imported by tests)

```ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const sqlite = openDatabaseSync('sugar.db');
export const db = drizzle(sqlite, { schema });
```

- [ ] **Step 4: Generate the initial migration**

Run: `npx drizzle-kit generate`
Expected: creates `drizzle/0000_<name>.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/0000_snapshot.json`, and `drizzle/migrations.js`. Confirm with `ls drizzle` and `ls drizzle/meta`.

- [ ] **Step 5: Write `src/test-support/test-db.ts`** (in-memory SQLite for repository tests)

```ts
import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { SugarDb } from '@/data/db/database';
import * as schema from '@/data/db/schema';

/**
 * Fresh in-memory SQLite DB with all migrations applied.
 * The single cast bridges the better-sqlite3 driver type to the shared SugarDb
 * type — safe because both drive the identical Drizzle sync API.
 */
export function createTestDb(): SugarDb {
  const sqlite = new BetterSqlite3(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: 'drizzle' });
  return db as unknown as SugarDb;
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. If `SugarDb` assignment complains, confirm the driver import paths and that `drizzle/` was generated.

---

## Task 9: SqliteReadingRepository (TDD, in-memory)

**Files:**
- Create: `src/data/repositories/sqlite-reading-repository.ts`
- Test: `src/data/repositories/__tests__/sqlite-reading-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { SqliteReadingRepository } from '@/data/repositories/sqlite-reading-repository';
import { createTestDb } from '@/test-support/test-db';

function makeReading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: 'r1',
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    hoursAfterMeal: undefined,
    notes: undefined,
    recordedAt: 1000,
    createdAt: 1000,
    updatedAt: 1000,
    syncStatus: SyncStatus.Pending,
    ...overrides,
  };
}

function newRepo(): SqliteReadingRepository {
  return new SqliteReadingRepository(createTestDb());
}

describe('SqliteReadingRepository', () => {
  it('creates and reads back a reading, normalizing null → undefined', async () => {
    const repo = newRepo();
    const reading = makeReading();
    await repo.create(reading);

    const loaded = await repo.getById('r1');
    expect(loaded).toEqual(reading);
    expect(loaded?.userId).toBeUndefined();
    expect(loaded?.hoursAfterMeal).toBeUndefined();
    expect(loaded?.notes).toBeUndefined();
  });

  it('returns undefined for a missing id', async () => {
    const repo = newRepo();
    expect(await repo.getById('nope')).toBeUndefined();
  });

  it('persists optional fields when present', async () => {
    const repo = newRepo();
    await repo.create(
      makeReading({
        id: 'r2',
        mealTiming: MealTiming.After,
        hoursAfterMeal: 2,
        notes: 'sau ăn sáng',
        userId: 'u1',
      }),
    );
    const loaded = await repo.getById('r2');
    expect(loaded?.hoursAfterMeal).toBe(2);
    expect(loaded?.notes).toBe('sau ăn sáng');
    expect(loaded?.userId).toBe('u1');
  });

  it('updates an existing reading', async () => {
    const repo = newRepo();
    await repo.create(makeReading());
    await repo.update(makeReading({ value: 90, updatedAt: 2000 }));
    const loaded = await repo.getById('r1');
    expect(loaded?.value).toBe(90);
    expect(loaded?.updatedAt).toBe(2000);
  });

  it('deletes a reading', async () => {
    const repo = newRepo();
    await repo.create(makeReading());
    await repo.delete('r1');
    expect(await repo.getById('r1')).toBeUndefined();
  });

  it('lists newest-first by recordedAt', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 3000 }));
    await repo.create(makeReading({ id: 'c', recordedAt: 2000 }));
    const list = await repo.list();
    expect(list.map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('filters list by inclusive recordedAt range', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 2000 }));
    await repo.create(makeReading({ id: 'c', recordedAt: 3000 }));
    const list = await repo.list({ from: 2000, to: 3000 });
    expect(list.map((r) => r.id)).toEqual(['c', 'b']);
  });

  it('counts all and filtered', async () => {
    const repo = newRepo();
    await repo.create(makeReading({ id: 'a', recordedAt: 1000 }));
    await repo.create(makeReading({ id: 'b', recordedAt: 2000 }));
    expect(await repo.count()).toBe(2);
    expect(await repo.count({ from: 1500 })).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sqlite-reading-repository`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import type { Reading } from '@/domain/models/reading';
import type {
  ReadingListFilter,
  ReadingRepository,
} from '@/domain/repositories/reading-repository';
import type { SugarDb } from '../db/database';
import { readings } from '../db/schema';

type ReadingRow = typeof readings.$inferSelect;

function toDomain(row: ReadingRow): Reading {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    value: row.value,
    mealType: row.mealType,
    mealTiming: row.mealTiming,
    hoursAfterMeal: row.hoursAfterMeal ?? undefined,
    notes: row.notes ?? undefined,
    recordedAt: row.recordedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    syncStatus: row.syncStatus,
  };
}

function toRow(reading: Reading): ReadingRow {
  return {
    id: reading.id,
    userId: reading.userId ?? null,
    value: reading.value,
    mealType: reading.mealType,
    mealTiming: reading.mealTiming,
    hoursAfterMeal: reading.hoursAfterMeal ?? null,
    notes: reading.notes ?? null,
    recordedAt: reading.recordedAt,
    createdAt: reading.createdAt,
    updatedAt: reading.updatedAt,
    syncStatus: reading.syncStatus,
  };
}

function whereFor(filter?: ReadingListFilter): SQL | undefined {
  const clauses: SQL[] = [];
  if (filter?.from !== undefined) clauses.push(gte(readings.recordedAt, filter.from));
  if (filter?.to !== undefined) clauses.push(lte(readings.recordedAt, filter.to));
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export class SqliteReadingRepository implements ReadingRepository {
  constructor(private readonly db: SugarDb) {}

  async create(reading: Reading): Promise<void> {
    this.db.insert(readings).values(toRow(reading)).run();
  }

  async update(reading: Reading): Promise<void> {
    this.db.update(readings).set(toRow(reading)).where(eq(readings.id, reading.id)).run();
  }

  async delete(id: string): Promise<void> {
    this.db.delete(readings).where(eq(readings.id, id)).run();
  }

  async getById(id: string): Promise<Reading | undefined> {
    const row = this.db.select().from(readings).where(eq(readings.id, id)).get();
    return row ? toDomain(row) : undefined;
  }

  async list(filter?: ReadingListFilter): Promise<Reading[]> {
    const rows = this.db
      .select()
      .from(readings)
      .where(whereFor(filter))
      .orderBy(desc(readings.recordedAt))
      .all();
    return rows.map(toDomain);
  }

  async count(filter?: ReadingListFilter): Promise<number> {
    const result = this.db
      .select({ value: count() })
      .from(readings)
      .where(whereFor(filter))
      .get();
    return result?.value ?? 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sqlite-reading-repository`
Expected: PASS.

---

## Task 10: SqliteSettingsRepository (TDD, in-memory)

**Files:**
- Create: `src/data/repositories/sqlite-settings-repository.ts`
- Test: `src/data/repositories/__tests__/sqlite-settings-repository.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { SqliteSettingsRepository } from '@/data/repositories/sqlite-settings-repository';
import { createTestDb } from '@/test-support/test-db';

function newRepo(): SqliteSettingsRepository {
  return new SqliteSettingsRepository(createTestDb());
}

describe('SqliteSettingsRepository', () => {
  it('returns defaults when a key is unset', async () => {
    const repo = newRepo();
    expect(await repo.get('preferredUnit')).toBe(Unit.MgDl);
    expect(await repo.get('preferredLanguage')).toBe(Language.Vietnamese);
    expect(await repo.get('fastingRange')).toEqual({ low: 70, high: 100 });
    expect(await repo.get('postMealRange')).toEqual({ low: 70, high: 140 });
    expect(await repo.get('alertsEnabled')).toBe(true);
    expect(await repo.get('onboardingDone')).toBe(false);
  });

  it('round-trips typed scalar values', async () => {
    const repo = newRepo();
    await repo.set('preferredUnit', Unit.MmolL);
    await repo.set('preferredLanguage', Language.English);
    await repo.set('alertsEnabled', false);
    await repo.set('onboardingDone', true);
    expect(await repo.get('preferredUnit')).toBe(Unit.MmolL);
    expect(await repo.get('preferredLanguage')).toBe(Language.English);
    expect(await repo.get('alertsEnabled')).toBe(false);
    expect(await repo.get('onboardingDone')).toBe(true);
  });

  it('round-trips a target-range object', async () => {
    const repo = newRepo();
    await repo.set('fastingRange', { low: 80, high: 110 });
    expect(await repo.get('fastingRange')).toEqual({ low: 80, high: 110 });
  });

  it('upserts: setting the same key twice keeps the latest value', async () => {
    const repo = newRepo();
    await repo.set('alertsEnabled', false);
    await repo.set('alertsEnabled', true);
    expect(await repo.get('alertsEnabled')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sqlite-settings-repository`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
import { eq } from 'drizzle-orm';
import { type AppSettings, DEFAULT_SETTINGS } from '@/domain/models/settings';
import type { SettingsRepository } from '@/domain/repositories/settings-repository';
import type { SugarDb } from '../db/database';
import { appSettings } from '../db/schema';

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SugarDb) {}

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const row = this.db.select().from(appSettings).where(eq(appSettings.id, key)).get();
    if (row === undefined) return DEFAULT_SETTINGS[key];
    return JSON.parse(row.value) as AppSettings[K];
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const serialized = JSON.stringify(value);
    const now = Date.now();
    this.db
      .insert(appSettings)
      .values({ id: key, key, value: serialized, updatedAt: now })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { value: serialized, updatedAt: now },
      })
      .run();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sqlite-settings-repository`
Expected: PASS.

---

## Task 11: Production id provider (adapter for Session 3 wiring)

**Files:**
- Create: `src/data/id.ts`

No tests — thin adapter over `expo-crypto`. Not imported by tests (keeps Jest free of native modules). Completes the injectable-deps story so Session 3 can wire `createReading` with a real id generator.

- [ ] **Step 1: Write `src/data/id.ts`**

```ts
import { randomUUID } from 'expo-crypto';

export function generateId(): string {
  return randomUUID();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

---

## Task 12: Remove unused template assets (PLAN.md carried-over follow-up)

**Files:**
- Delete: `assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`, `expo-badge.png`, `expo-badge-white.png`, `tutorial-web.png`, and the `assets/images/tabIcons/` directory

- [ ] **Step 1: Confirm nothing references them**

Run: `rg -n "react-logo|expo-badge|tutorial-web|tabIcons" app.json app src`
Expected: **no matches**. If any match appears, stop and remove the reference first.

- [ ] **Step 2: Delete the files**

```bash
rm assets/images/react-logo.png assets/images/react-logo@2x.png assets/images/react-logo@3x.png \
   assets/images/expo-badge.png assets/images/expo-badge-white.png \
   assets/images/tutorial-web.png
rm -r assets/images/tabIcons
```

- [ ] **Step 3: Commit the chore (separate from the feature commit)**

```bash
git add -A
git commit -m "chore: remove unused template assets"
```

---

## Task 13: Full verification & feature commit

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — all suites green (convert-unit, validate-reading-value, evaluate-reading, reading-use-cases, sqlite-reading-repository, sqlite-settings-repository).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings; no new errors).

- [ ] **Step 4: Confirm the app still boots** (no UI changed, but the schema/client modules must not break the bundle)

Run: `npx expo start` and confirm the dev server starts without a bundling error, then stop it. (No new screen to reach — Session 2 is data-only.)

- [ ] **Step 5: Commit the feature**

```bash
git add -A
git commit -m "feat: data layer — schema, repositories, reading use cases"
```

---

## Self-review checklist (against PLAN.md Session 2 + PRD)

- [x] **Drizzle schema** `readings` + `app_settings` exactly per PRD data model — `syncStatus` default `'pending'`, `userId` nullable → Task 8.
- [x] **Migration setup + db client** (`src/data/db/`) → Task 1 (drizzle.config) + Task 8 (generate, client.ts, metro sql ext).
- [x] **ReadingRepository**: create, update, delete, getById, list(dateRange filter, newest-first), count → Tasks 6 (port) + 9 (impl + tests).
- [x] **SettingsRepository**: typed get/set for all six keys → Tasks 6 (port) + 10 (impl + tests).
- [x] **Reading model** → Task 2.
- [x] **Unit conversion** per PRD rounding rules + round-trip rule → Task 3.
- [x] **Validation** 20–600 int mg/dL / 1.1–33.3 mmol/L, comma separator, warn-only out-of-range → Task 4.
- [x] **create/update/delete use cases** → Task 7.
- [x] **Target-range evaluation** with Before/After auto-selection → Task 5.
- [x] **Tests**: conversion round-trips; validation edges (19, 20, 600, 601, decimals in mg/dL, comma decimal in mmol/L); range evaluation both contexts; repository CRUD + date filtering on in-memory SQLite → Tasks 3, 4, 5, 9, 10.
- [x] **Accept**: `npm test` green (Task 13) + no React/Expo/data imports in `src/domain` (Task 7, Step 8).
- [x] **Commit message** exact: `feat: data layer — schema, repositories, reading use cases` (Task 13) + carried `chore: remove unused template assets` (Task 12).

**Type-consistency check:** `SugarDb` (Task 8) is the single DB type used by both repositories (Tasks 9–10) and the test helper (Task 8). `ReadingUseCaseDeps` (Task 7) is shared by all three use cases. `ReadingRepository` / `SettingsRepository` ports (Task 6) are implemented verbatim by the SQLite classes. `AppSettings` keys (Task 2) match the six keys required by PLAN.md.
