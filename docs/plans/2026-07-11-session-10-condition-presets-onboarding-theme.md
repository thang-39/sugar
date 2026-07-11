# Session 10 — Condition presets + onboarding v2 + per-mode theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This document is **self-contained** — read it top to bottom; you are not expected to have prior context on this repo.

**Goal:** Make the app understand *who* it is tracking for (gestational diabetes vs. general daily tracking) as **configuration, not a code fork** — new onboarding flow, per-mode target-range + theme presets, and a 2-hour after-meal range — with **zero readings migration**.

**Architecture:** `conditionType` is a new `app_settings` key. A single `CONDITION_PRESETS` map turns that key into initial target ranges + a theme name + an after-meal protocol; downstream features read plain settings. Theme swaps evergreen↔rose at runtime via a React context (`ThemeProvider` + `useTheme()`) driven by `conditionType`; the shared UI **primitives** in `src/ui/components/ui/` read colors from the hook, so re-skinning is centralized. `readings` schema is untouched — GDM "slots" are pure projections over existing rows.

**Tech Stack:** Expo + Expo Router, TypeScript strict (`noUncheckedIndexedAccess` on), expo-sqlite + Drizzle (JSON kv settings — **no migration**), Zustand (UI/settings state), react-i18next (vi default, en fallback), Jest + RN Testing Library, `@react-native-community/datetimepicker` (already installed).

**Design source of truth:** `design/Sugar App.dc.html` (the "redesign for PLAN-2" export). Rose palette hexes are taken verbatim from its `ROSE`/`EVERGREEN` objects (~line 993). Never guess token values.

---

## Ground rules (READ FIRST)

- **Respond to the user in Vietnamese** (per global CLAUDE.md). Code, identifiers, and this plan stay in English.
- **No `enum`** — use `as const` objects + derived union types.
- **No `any`** — use `unknown` + narrow. Explicit return types on exported functions.
- **Blood sugar always stored mg/dL** (integer). mmol/L is display-only.
- **`interface` for object shapes; `type` for unions/compositions.** Files `kebab-case.ts`, components `PascalCase.tsx`.
- **Prefer `undefined` in app code**, BUT the generic settings kv store serializes with `JSON.stringify`, and `JSON.stringify(undefined)` breaks a `set`. So the two **nullable persisted settings** (`dueDate`, `postMeal2hRange`) use `null` as their persisted/absent value. This is a deliberate, documented exception — `null` round-trips cleanly through JSON.
- **Reuse primitives** in `src/ui/components/ui/` — never hand-write inline card/button/chip StyleSheet.
- **All user-facing strings via i18n** (vi + en). No hardcoded text.
- **Do NOT pull work from later sessions.** In particular: the "Today" tab is **Session 12**, reminders are **Session 11**, the doctor-report/PDF + removing the Export screen is **Session 13**. This session leaves the Export screen and the Settings "Export data" row **exactly as they are**. `getDaySlots` and `pregnancyWeek` are built here (pure + tested) but are **not yet wired into any screen** — Session 12 consumes them.

**Definition of Done (all must hold before the final commit):**
1. Fresh install → GDM path prefills fasting + both after-meal ranges and the app renders the **rose** theme; skip / "Daily tracking" path is byte-identical to today (green, same defaults).
2. No new Drizzle migration.
3. `getDaySlots` / `evaluateReading` / `pregnancyWeek` tests cover: duplicates, Snack→extras, 2h-range fallback, day boundary in device tz, `1h+2h` follow-up.
4. `npx tsc --noEmit` passes and `npm test` passes.
5. App boots; onboarding v2 is reachable and the theme switch works.
6. Committed: `feat: condition presets, onboarding v2, per-mode theme`.

---

## File map

**Create:**
- `src/domain/models/condition.ts` — `ConditionType`, `AfterMealProtocol`, `ConditionTheme`, `ConditionPreset`, `CONDITION_PRESETS`.
- `src/domain/use-cases/pregnancy-week.ts` — `pregnancyWeek(dueDate, now)`.
- `src/domain/use-cases/get-day-slots.ts` — `getDaySlots`, `SlotDef`, `DaySlot`, `DaySlotsResult`.
- `src/domain/use-cases/__tests__/pregnancy-week.test.ts`
- `src/domain/use-cases/__tests__/get-day-slots.test.ts`
- `src/ui/theme/theme-context.tsx` — `ThemeProvider`, `useTheme`.
- `app/(tabs)/settings/tracking-mode.tsx` — mode picker + confirm dialog.

**Modify:**
- `src/domain/models/settings.ts` — 4 new keys on `AppSettings` + `DEFAULT_SETTINGS`.
- `src/domain/models/target-range.ts` — add optional `postMeal2h` to `TargetRanges`.
- `src/domain/use-cases/evaluate-reading.ts` — 2h-range selection.
- `src/domain/use-cases/__tests__/evaluate-reading.test.ts` — new 2h cases.
- `src/ui/hooks/use-settings.ts` — read 4 new keys; add `applyConditionPreset` action.
- `src/ui/theme/colors.ts` — refactor into `buildColors` + `evergreen`/`rose` palettes + `colorSchemes`; keep `colors` (evergreen) export.
- `src/ui/theme/index.ts` — export new theme surface.
- `app/_layout.tsx` — wrap ready tree in `<ThemeProvider>`.
- `app/(tabs)/_layout.tsx` — tab bar/header options from `useTheme()`.
- Shared primitives in `src/ui/components/ui/` that reference theme-varying tokens (see Task 11).
- `app/onboarding.tsx` — 3-step flow (welcome → condition → gdm).
- `app/(tabs)/settings/index.tsx` — add "Chế độ theo dõi" row.
- `app/(tabs)/history/index.tsx`, `app/(tabs)/history/[id]/index.tsx`, `app/(tabs)/trends.tsx` — pass `postMeal2h` into the ranges object.
- `src/i18n/vi.json`, `src/i18n/en.json` — new keys.

---

## Task 1: Domain — condition model + presets

**Files:**
- Create: `src/domain/models/condition.ts`

- [ ] **Step 1: Create the model file**

```ts
import type { TargetRange } from './target-range';

export const ConditionType = {
  Gestational: 'gestational',
  General: 'general',
} as const;
export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];

export const AfterMealProtocol = {
  OneHour: '1h',
  TwoHours: '2h',
  OneThenTwo: '1h+2h',
} as const;
export type AfterMealProtocol = (typeof AfterMealProtocol)[keyof typeof AfterMealProtocol];

/** Theme preset name. UI maps this to an actual palette (see src/ui/theme/colors.ts). */
export const ConditionTheme = {
  Evergreen: 'evergreen',
  Rose: 'rose',
} as const;
export type ConditionTheme = (typeof ConditionTheme)[keyof typeof ConditionTheme];

/**
 * A preset INITIALIZES settings for a condition — it is never a second source of
 * truth. Applying a preset writes target ranges + theme + default protocol into
 * settings; the user's later edits win. Canonical mg/dL.
 */
export interface ConditionPreset {
  theme: ConditionTheme;
  fastingRange: TargetRange;
  postMealRange: TargetRange; // 1h / primary after-meal range
  postMeal2hRange?: TargetRange; // only gestational
  afterMealProtocol: AfterMealProtocol;
}

export const CONDITION_PRESETS: Record<ConditionType, ConditionPreset> = {
  gestational: {
    theme: ConditionTheme.Rose,
    fastingRange: { low: 70, high: 95 },
    postMealRange: { low: 70, high: 140 },
    postMeal2hRange: { low: 70, high: 120 },
    afterMealProtocol: AfterMealProtocol.OneHour,
  },
  general: {
    theme: ConditionTheme.Evergreen,
    fastingRange: { low: 70, high: 100 },
    postMealRange: { low: 70, high: 140 },
    postMeal2hRange: undefined,
    afterMealProtocol: AfterMealProtocol.OneHour,
  },
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/domain/models/condition.ts
git commit -m "feat: condition types and presets"
```

---

## Task 2: Domain — settings model gains 4 keys

**Files:**
- Modify: `src/domain/models/settings.ts`

- [ ] **Step 1: Add imports + keys + defaults**

Replace the whole file with:

```ts
import type { AfterMealProtocol, ConditionType } from './condition';
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
  postMealRange: TargetRange; // stored in mg/dL (1h / primary)
  alertsEnabled: boolean;
  onboardingDone: boolean;
  // --- Session 10: condition profile (JSON kv, no migration) ---
  conditionType: ConditionType;
  /** Expected delivery date, unix ms. `null` = not set (persisted as JSON null). */
  dueDate: number | null;
  afterMealProtocol: AfterMealProtocol;
  /** 2h after-meal range (gestational). `null` = not set. */
  postMeal2hRange: TargetRange | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  preferredUnit: Unit.MgDl,
  preferredLanguage: Language.Vietnamese,
  fastingRange: { low: 70, high: 100 },
  postMealRange: { low: 70, high: 140 },
  alertsEnabled: true,
  onboardingDone: false,
  conditionType: 'general',
  dueDate: null,
  afterMealProtocol: '1h',
  postMeal2hRange: null,
};
```

> Note: existing installs have no rows for the new keys, so `SettingsRepository.get` returns these defaults → every current user silently stays `general`/evergreen. No migration needed because settings are a JSON key/value store.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (The generic `SettingsRepository.get/set` are already `<K extends keyof AppSettings>`, so they cover the new keys automatically.)

- [ ] **Step 3: Commit**

```bash
git add src/domain/models/settings.ts
git commit -m "feat: condition settings keys with safe defaults"
```

---

## Task 3: Domain — `evaluateReading` uses the 2h range (TDD)

**Files:**
- Modify: `src/domain/models/target-range.ts`
- Modify: `src/domain/use-cases/evaluate-reading.ts`
- Test: `src/domain/use-cases/__tests__/evaluate-reading.test.ts`

- [ ] **Step 1: Add the failing tests** (append inside the existing top-level `describe` or add a new `describe` block; keep existing tests intact)

```ts
import { MealTiming } from '@/domain/models/meal';
import { RangeEvaluation } from '@/domain/models/target-range';

describe('evaluateReading — 2h after-meal range (gestational)', () => {
  const ranges = {
    fasting: { low: 70, high: 95 },
    postMeal: { low: 70, high: 140 }, // 1h
    postMeal2h: { low: 70, high: 120 }, // 2h
  };

  it('uses the 2h range when hoursAfterMeal >= 2 and postMeal2h is set', () => {
    // 130 is IN the 1h range (<=140) but OUT of the 2h range (>120)
    expect(
      evaluateReading({ value: 130, mealTiming: MealTiming.After, hoursAfterMeal: 2 }, ranges),
    ).toBe(RangeEvaluation.High);
  });

  it('uses the 1h range when hoursAfterMeal is 1', () => {
    expect(
      evaluateReading({ value: 130, mealTiming: MealTiming.After, hoursAfterMeal: 1 }, ranges),
    ).toBe(RangeEvaluation.InRange);
  });

  it('falls back to the 1h range when postMeal2h is absent (general mode)', () => {
    const general = { fasting: { low: 70, high: 100 }, postMeal: { low: 70, high: 140 } };
    expect(
      evaluateReading({ value: 130, mealTiming: MealTiming.After, hoursAfterMeal: 2 }, general),
    ).toBe(RangeEvaluation.InRange);
  });

  it('ignores hoursAfterMeal for before-meal readings', () => {
    expect(
      evaluateReading({ value: 130, mealTiming: MealTiming.Before, hoursAfterMeal: 2 }, ranges),
    ).toBe(RangeEvaluation.High); // 130 > fasting.high (95)
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- evaluate-reading`
Expected: FAIL (`postMeal2h` not on the type / not used; behavior wrong).

- [ ] **Step 3: Extend the `TargetRanges` type**

In `src/domain/models/target-range.ts`, change the `TargetRanges` interface to:

```ts
export interface TargetRanges {
  fasting: TargetRange; // used when mealTiming === 'Before'
  postMeal: TargetRange; // used when mealTiming === 'After' (1h / primary)
  postMeal2h?: TargetRange; // gestational: readings >= 2h after a meal, when set
}
```

- [ ] **Step 4: Implement the selection**

Replace `src/domain/use-cases/evaluate-reading.ts` with:

```ts
import { MealTiming } from '../models/meal';
import type { Reading } from '../models/reading';
import { RangeEvaluation, type TargetRange, type TargetRanges } from '../models/target-range';

type EvalInput = Pick<Reading, 'value' | 'mealTiming'> & Partial<Pick<Reading, 'hoursAfterMeal'>>;

/**
 * Evaluate a reading against target ranges, auto-selecting the range by meal timing.
 * All values mg/dL; bounds inclusive. When a reading is >= 2h after a meal and a 2h
 * range is provided (gestational), that range is used; otherwise the 1h range.
 */
export function evaluateReading(reading: EvalInput, ranges: TargetRanges): RangeEvaluation {
  const range = selectRange(reading, ranges);
  if (reading.value < range.low) return RangeEvaluation.Low;
  if (reading.value > range.high) return RangeEvaluation.High;
  return RangeEvaluation.InRange;
}

function selectRange(reading: EvalInput, ranges: TargetRanges): TargetRange {
  if (reading.mealTiming !== MealTiming.After) return ranges.fasting;
  const hours = reading.hoursAfterMeal;
  if (hours != null && hours >= 2 && ranges.postMeal2h) return ranges.postMeal2h;
  return ranges.postMeal;
}
```

> `TargetRange` is now re-imported here; confirm `target-range.ts` still `export`s it (it does).

- [ ] **Step 5: Run — expect PASS (all evaluate-reading tests)**

Run: `npm test -- evaluate-reading`
Expected: PASS, including the pre-existing cases (they pass no `hoursAfterMeal`/`postMeal2h`, so behavior is unchanged → general mode byte-identical).

- [ ] **Step 6: Commit**

```bash
git add src/domain/models/target-range.ts src/domain/use-cases/evaluate-reading.ts src/domain/use-cases/__tests__/evaluate-reading.test.ts
git commit -m "feat: evaluate 2h after-meal range for gestational mode"
```

---

## Task 4: Domain — `pregnancyWeek` (TDD)

**Files:**
- Create: `src/domain/use-cases/pregnancy-week.ts`
- Test: `src/domain/use-cases/__tests__/pregnancy-week.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { pregnancyWeek } from '@/domain/use-cases/pregnancy-week';

const DAY = 86_400_000;

describe('pregnancyWeek', () => {
  const due = new Date(2026, 8, 15).getTime(); // fixed, tz-agnostic for these deltas

  it('is week 40 on the due date', () => {
    expect(pregnancyWeek(due, due)).toBe(40);
  });

  it('is week 36 four weeks before the due date', () => {
    expect(pregnancyWeek(due, due - 28 * DAY)).toBe(36);
  });

  it('clamps to 1 well before term (40 weeks out)', () => {
    expect(pregnancyWeek(due, due - 280 * DAY)).toBe(1);
  });

  it('clamps to 42 after the due date has passed', () => {
    expect(pregnancyWeek(due, due + 21 * DAY)).toBe(42);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- pregnancy-week`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
const MS_PER_DAY = 86_400_000;

/**
 * Estimated pregnancy week from an expected delivery date, assuming a 40-week term.
 * `now`/`dueDate` are unix ms. Result clamped to 1–42.
 */
export function pregnancyWeek(dueDate: number, now: number): number {
  const daysUntilDue = Math.ceil((dueDate - now) / MS_PER_DAY);
  const weeksUntilDue = Math.ceil(daysUntilDue / 7);
  const week = 40 - weeksUntilDue;
  return Math.min(42, Math.max(1, week));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- pregnancy-week`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/use-cases/pregnancy-week.ts src/domain/use-cases/__tests__/pregnancy-week.test.ts
git commit -m "feat: pregnancyWeek helper"
```

---

## Task 5: Domain — `getDaySlots` (TDD)

Projects a day's readings onto a list of slot definitions. **Not wired into any screen this session** — Session 12 will derive `slotDefs` from reminders and render it. Build it pure + tested now.

**Files:**
- Create: `src/domain/use-cases/get-day-slots.ts`
- Test: `src/domain/use-cases/__tests__/get-day-slots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { SyncStatus } from '@/domain/models/reading';
import { getDaySlots, type SlotDef } from '@/domain/use-cases/get-day-slots';

// Minimal reading factory — only fields getDaySlots reads matter.
function r(partial: Partial<Reading> & { id: string; recordedAt: number }): Reading {
  return {
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    hoursAfterMeal: undefined,
    notes: undefined,
    createdAt: partial.recordedAt,
    updatedAt: partial.recordedAt,
    syncStatus: SyncStatus.Pending,
    ...partial,
  };
}

const date = new Date(2026, 6, 11); // 11 Jul 2026, local
const at = (h: number, m = 0): number => new Date(2026, 6, 11, h, m).getTime();

const CLASSIC: SlotDef[] = [
  { id: 'fasting', mealType: MealType.Breakfast, mealTiming: MealTiming.Before },
  { id: 'after-breakfast', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
  { id: 'after-lunch', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
  { id: 'after-dinner', mealType: MealType.Dinner, mealTiming: MealTiming.After, hoursAfterMeal: 1 },
];

describe('getDaySlots', () => {
  it('marks matched slots done and unmatched slots pending', () => {
    const readings = [r({ id: 'a', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, recordedAt: at(6, 30) })];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'fasting')?.status).toBe('done');
    expect(slots.find((s) => s.def.id === 'fasting')?.reading?.id).toBe('a');
    expect(slots.find((s) => s.def.id === 'after-lunch')?.status).toBe('pending');
  });

  it('prefers the reading whose hoursAfterMeal matches the slot, over the latest', () => {
    const readings = [
      r({ id: 'later-2h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, recordedAt: at(9, 30) }),
      r({ id: 'match-1h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, recordedAt: at(8, 30) }),
    ];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'after-breakfast')?.reading?.id).toBe('match-1h');
  });

  it('falls back to the latest matching reading when none matches the protocol timing', () => {
    const readings = [
      r({ id: 'early', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 3, recordedAt: at(13, 0) }),
      r({ id: 'late', mealType: MealType.Lunch, mealTiming: MealTiming.After, hoursAfterMeal: 3, recordedAt: at(14, 0) }),
    ];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'after-lunch')?.reading?.id).toBe('late');
  });

  it('routes Snack (and other unmatched readings) to extras, never dropping them', () => {
    const readings = [
      r({ id: 'snack', mealType: MealType.Snack, mealTiming: MealTiming.After, hoursAfterMeal: 1, recordedAt: at(10, 20) }),
    ];
    const { slots, extras } = getDaySlots(readings, date, CLASSIC);
    expect(slots.every((s) => s.status === 'pending')).toBe(true);
    expect(extras.map((e) => e.id)).toEqual(['snack']);
  });

  it('attaches a 2h re-check as followUp on a 1h slot (1h+2h protocol)', () => {
    const readings = [
      r({ id: 'bk-1h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 1, recordedAt: at(8, 30) }),
      r({ id: 'bk-2h', mealType: MealType.Breakfast, mealTiming: MealTiming.After, hoursAfterMeal: 2, recordedAt: at(9, 30) }),
    ];
    const { slots, extras } = getDaySlots(readings, date, CLASSIC);
    const slot = slots.find((s) => s.def.id === 'after-breakfast');
    expect(slot?.reading?.id).toBe('bk-1h');
    expect(slot?.followUp?.id).toBe('bk-2h');
    expect(extras).toHaveLength(0); // follow-up is claimed, not dropped to extras
  });

  it('only counts readings from the given day (device local tz boundary)', () => {
    const readings = [
      r({ id: 'yesterday', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, recordedAt: new Date(2026, 6, 10, 23, 59).getTime() }),
      r({ id: 'today', mealType: MealType.Breakfast, mealTiming: MealTiming.Before, recordedAt: new Date(2026, 6, 11, 0, 1).getTime() }),
    ];
    const { slots } = getDaySlots(readings, date, CLASSIC);
    expect(slots.find((s) => s.def.id === 'fasting')?.reading?.id).toBe('today');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- get-day-slots`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { MealTiming, MealType } from '../models/meal';
import type { Reading } from '../models/reading';

export interface SlotDef {
  /** Stable id, e.g. 'fasting', 'after-breakfast'. */
  id: string;
  mealType: MealType;
  mealTiming: MealTiming;
  /** After-meal slots: the protocol timing (in hours) this slot represents. */
  hoursAfterMeal?: number;
}

export interface DaySlot {
  def: SlotDef;
  status: 'done' | 'pending';
  /** The reading matched to this slot, if any. */
  reading?: Reading;
  /** A later same-meal re-check (e.g. the 2h reading under a 1h+2h protocol). */
  followUp?: Reading;
}

export interface DaySlotsResult {
  slots: DaySlot[];
  /** Day readings not claimed by any slot (e.g. Snack). Never dropped. */
  extras: Reading[];
}

/**
 * Project a day's readings onto slot definitions. Pure. `date` is interpreted in the
 * device's local timezone. Duplicate handling: prefer a reading whose hoursAfterMeal
 * matches the slot's protocol timing, else the latest matching reading.
 */
export function getDaySlots(
  readings: readonly Reading[],
  date: Date,
  slotDefs: readonly SlotDef[],
): DaySlotsResult {
  const dayReadings = readings.filter((reading) => isSameLocalDay(reading.recordedAt, date));
  const claimed = new Set<string>();

  const slots: DaySlot[] = slotDefs.map((def) => {
    const candidates = dayReadings.filter(
      (reading) =>
        reading.mealType === def.mealType &&
        reading.mealTiming === def.mealTiming &&
        !claimed.has(reading.id),
    );
    const primary = pickPrimary(candidates, def);
    let followUp: Reading | undefined;
    if (primary) {
      claimed.add(primary.id);
      if (def.mealTiming === 'After' && def.hoursAfterMeal === 1) {
        followUp = candidates
          .filter((reading) => reading.id !== primary.id && (reading.hoursAfterMeal ?? 0) >= 2)
          .sort((a, b) => b.recordedAt - a.recordedAt)[0];
        if (followUp) claimed.add(followUp.id);
      }
    }
    return { def, status: primary ? 'done' : 'pending', reading: primary, followUp };
  });

  const extras = dayReadings.filter((reading) => !claimed.has(reading.id));
  return { slots, extras };
}

function pickPrimary(candidates: readonly Reading[], def: SlotDef): Reading | undefined {
  if (candidates.length === 0) return undefined;
  if (def.hoursAfterMeal != null) {
    const exact = candidates
      .filter((reading) => reading.hoursAfterMeal === def.hoursAfterMeal)
      .sort((a, b) => b.recordedAt - a.recordedAt);
    if (exact[0]) return exact[0];
  }
  return candidates.slice().sort((a, b) => b.recordedAt - a.recordedAt)[0];
}

function isSameLocalDay(timestamp: number, date: Date): boolean {
  const d = new Date(timestamp);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === date.getDate()
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- get-day-slots`
Expected: PASS (all 7 cases).

- [ ] **Step 5: Commit**

```bash
git add src/domain/use-cases/get-day-slots.ts src/domain/use-cases/__tests__/get-day-slots.test.ts
git commit -m "feat: getDaySlots projection helper"
```

---

## Task 6: Settings store — read new keys + `applyConditionPreset`

**Files:**
- Modify: `src/ui/hooks/use-settings.ts`

- [ ] **Step 1: Add imports at the top**

Add below the existing imports:

```ts
import { CONDITION_PRESETS, type ConditionType } from '@/domain/models/condition';
```

- [ ] **Step 2: Extend the store interface**

Add to `interface SettingsStore` (after `updateSetting`):

```ts
  /** Re-apply a condition preset over target ranges + theme + protocol. Never touches readings. */
  applyConditionPreset: (conditionType: ConditionType) => Promise<void>;
```

- [ ] **Step 3: Read the 4 new keys in `initialize`**

Change the `Promise.all` destructure + call list to include the new keys, and pass them to `set`:

```ts
    const [
      preferredUnit,
      preferredLanguage,
      fastingRange,
      postMealRange,
      alertsEnabled,
      onboardingDone,
      conditionType,
      dueDate,
      afterMealProtocol,
      postMeal2hRange,
    ] = await Promise.all([
      getSettingsRepo().get('preferredUnit'),
      getSettingsRepo().get('preferredLanguage'),
      getSettingsRepo().get('fastingRange'),
      getSettingsRepo().get('postMealRange'),
      getSettingsRepo().get('alertsEnabled'),
      getSettingsRepo().get('onboardingDone'),
      getSettingsRepo().get('conditionType'),
      getSettingsRepo().get('dueDate'),
      getSettingsRepo().get('afterMealProtocol'),
      getSettingsRepo().get('postMeal2hRange'),
    ]);

    set({
      preferredUnit,
      preferredLanguage,
      fastingRange,
      postMealRange,
      alertsEnabled,
      onboardingDone,
      conditionType,
      dueDate,
      afterMealProtocol,
      postMeal2hRange,
      isInitialized: true,
    });
```

- [ ] **Step 4: Implement `applyConditionPreset`**

Add this action to the store object (after `updateSetting`):

```ts
  applyConditionPreset: async (conditionType) => {
    const preset = CONDITION_PRESETS[conditionType];
    const post2 = preset.postMeal2hRange ?? null;
    const repo = getSettingsRepo();
    await Promise.all([
      repo.set('conditionType', conditionType),
      repo.set('fastingRange', preset.fastingRange),
      repo.set('postMealRange', preset.postMealRange),
      repo.set('postMeal2hRange', post2),
      repo.set('afterMealProtocol', preset.afterMealProtocol),
    ]);
    set({
      conditionType,
      fastingRange: preset.fastingRange,
      postMealRange: preset.postMealRange,
      postMeal2hRange: post2,
      afterMealProtocol: preset.afterMealProtocol,
    });
  },
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/hooks/use-settings.ts
git commit -m "feat: settings store reads condition keys and applies presets"
```

---

## Task 7: Wire the 2h range into read screens

Gestational users' History/Trends/Detail should judge readings against the 2h range. This is a small, safe additive change (general users have `postMeal2hRange === null` → `undefined` → identical behavior).

**Files:**
- Modify: `app/(tabs)/history/index.tsx`
- Modify: `app/(tabs)/history/[id]/index.tsx`
- Modify: `app/(tabs)/trends.tsx`

- [ ] **Step 1: History list**

In `app/(tabs)/history/index.tsx`, add `postMeal2hRange` to the `useSettingsStore` destructure (line ~70) and to the ranges memo (line ~86):

```ts
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange, postMeal2hRange } =
    useSettingsStore();
  // ...
  const ranges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );
```

- [ ] **Step 2: History detail**

In `app/(tabs)/history/[id]/index.tsx`, add `postMeal2hRange` to the destructure (line ~33) and update the `evaluateReading` call (line ~55):

```ts
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange, postMeal2hRange } =
    useSettingsStore();
  // ...
  const evaluation = evaluateReading(reading, {
    fasting: fastingRange,
    postMeal: postMealRange,
    postMeal2h: postMeal2hRange ?? undefined,
  });
```

- [ ] **Step 3: Trends**

In `app/(tabs)/trends.tsx`, add `postMeal2hRange` to the destructure (line ~89) and the ranges memo (line ~100):

```ts
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange, postMeal2hRange } =
    useSettingsStore();
  // ...
  const ranges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );
```

- [ ] **Step 4: Type-check + test**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/history/index.tsx app/\(tabs\)/history/\[id\]/index.tsx app/\(tabs\)/trends.tsx
git commit -m "feat: pass 2h range into history and trends"
```

---

## Task 8: Theme — palettes + `buildColors` + schemes

Refactor `colors.ts` so the full color object is built by `buildColors(palette)`. `colors` stays exported as the evergreen scheme (back-compat for any module not yet on the hook). Rose hexes are verbatim from the design file's `ROSE` object.

**Files:**
- Modify: `src/ui/theme/colors.ts`

- [ ] **Step 1: Replace `colors.ts` entirely**

```ts
/**
 * Color tokens — Evergreen (default) + Rose (gestational) presets.
 * Only brand + neutral-ramp tokens differ between presets; text ramp, accents, and
 * non-brand status colors are constant. Values reconciled against design/Sugar App.dc.html
 * (EVERGREEN / ROSE objects). Light theme only (dark mode out of scope for v1).
 */
import type { ConditionTheme } from '@/domain/models/condition';

/** The tokens that vary per theme preset. */
interface Palette {
  brand: string; // primary / accent (links, toggles, in-range)
  brandDark: string;
  brandInk: string; // darker brand — status text + in-range label (WCAG-safe)
  surface: string; // soft tinted surface (chips, tints)
  surfaceMuted: string;
  bg: string; // app background
  border: string;
  borderStrong: string;
}

const evergreen: Palette = {
  brand: '#0FA36B',
  brandDark: '#0E8F5E',
  brandInk: '#0A7350',
  surface: '#E9F5EF',
  surfaceMuted: '#DCEDE4',
  bg: '#F7FBF8',
  border: '#E2EDE7',
  borderStrong: '#CFE6DA',
};

const rose: Palette = {
  brand: '#D14C87',
  brandDark: '#BC3F76',
  brandInk: '#A62C63',
  surface: '#FBE9F1',
  surfaceMuted: '#F6D9E6',
  bg: '#FDF6FA',
  border: '#F1DEE8',
  borderStrong: '#EAC9DA',
};

/** Constant, theme-independent values. */
const constant = {
  ink: '#1B2B24', // near-black — primary text & the dark CTA pill
  white: '#FFFFFF',
  textPrimary: '#1B2B24',
  textSecondary: '#5C6F66',
  textMuted: '#8A9A91',
  textFaint: '#B7C7BE',
  divider: '#F1F6F3',
  blue: '#4E7CF6',
  purple: '#8B5CF6',
  amber: '#F5B301',
  orange: '#E8622C', // out-of-range / high
  amberText: '#8A5D00',
  orangeText: '#B23C10',
  warnBg: '#FDECE4',
  amberBg: '#FCF3DE',
  black: '#000000',
} as const;

function buildColors(p: Palette) {
  return {
    // Brand
    primary: p.brand,
    primaryDark: p.brandDark,
    primaryLight: p.surface,
    onPrimary: constant.white,

    // CTA button (dark ink pill — constant across themes)
    primaryButton: constant.ink,
    onPrimaryButton: constant.white,

    // Surfaces
    background: p.bg,
    surface: p.surface,
    surfaceMuted: p.surfaceMuted,
    card: constant.white,
    border: p.border,
    borderStrong: p.borderStrong,
    divider: constant.divider,

    // Text
    text: constant.textPrimary,
    textMuted: constant.textSecondary,
    textFaint: constant.textMuted,
    textDisabled: constant.textFaint,
    onDark: constant.white,

    // Accent (charts, tiles, badges) — constant
    accentBlue: constant.blue,
    accentPurple: constant.purple,
    accentAmber: constant.amber,
    accentOrange: constant.orange,

    // Blood-sugar status
    inRange: p.brand,
    inRangeBg: p.surface,
    low: constant.amber,
    lowBg: constant.amberBg,
    high: constant.orange,
    highBg: constant.warnBg,
    outOfRange: constant.orange,
    warnBg: constant.warnBg,

    // Status TEXT colors (contrast-safe)
    inRangeText: p.brandInk,
    lowText: constant.amberText,
    highText: constant.orangeText,

    // Feedback
    error: constant.orange,
    success: p.brand,
  } as const;
}

export type ColorScheme = ReturnType<typeof buildColors>;

/** Named schemes keyed by ConditionTheme. */
export const colorSchemes: Record<ConditionTheme, ColorScheme> = {
  evergreen: buildColors(evergreen),
  rose: buildColors(rose),
};

/** Back-compat static export (evergreen). Modules not yet on useTheme() use this. */
export const colors = colorSchemes.evergreen;

/** Per-meal accent color — constant across themes. */
export const mealColor = {
  Breakfast: constant.amber,
  Lunch: constant.blue,
  Dinner: constant.purple,
  Snack: constant.orange,
} as const;

export type ColorToken = keyof ColorScheme;
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (Shape of `colors` is unchanged, so all 34 existing consumers still compile.)

- [ ] **Step 3: Commit**

```bash
git add src/ui/theme/colors.ts
git commit -m "feat: evergreen and rose color schemes"
```

---

## Task 9: Theme — `ThemeProvider` + `useTheme`

**Files:**
- Create: `src/ui/theme/theme-context.tsx`
- Modify: `src/ui/theme/index.ts`

- [ ] **Step 1: Create the context**

```tsx
import { createContext, useContext, useMemo, type ReactElement, type ReactNode } from 'react';

import { CONDITION_PRESETS } from '@/domain/models/condition';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { type ColorScheme, colorSchemes } from './colors';

const ThemeContext = createContext<ColorScheme>(colorSchemes.evergreen);

/**
 * Provides the active color scheme, selected by the user's conditionType via
 * CONDITION_PRESETS. Re-renders (and re-themes the whole subtree) when the mode changes.
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const conditionType = useSettingsStore((s) => s.conditionType);
  const scheme = useMemo(
    () => colorSchemes[CONDITION_PRESETS[conditionType].theme],
    [conditionType],
  );
  return <ThemeContext.Provider value={scheme}>{children}</ThemeContext.Provider>;
}

/** Active color scheme. Same shape as the static `colors` export. */
export function useTheme(): ColorScheme {
  return useContext(ThemeContext);
}
```

- [ ] **Step 2: Export from the theme barrel**

In `src/ui/theme/index.ts`, add these exports (keep existing lines):

```ts
export { colorSchemes, type ColorScheme } from './colors';
export { ThemeProvider, useTheme } from './theme-context';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/theme/theme-context.tsx src/ui/theme/index.ts
git commit -m "feat: theme provider and useTheme hook"
```

---

## Task 10: Theme — mount the provider + theme the tab bar

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Wrap the ready tree in `ThemeProvider`**

In `app/_layout.tsx`:
1. Add `ThemeProvider` to the theme import: `import { colors, fontSize, fontFamily, ThemeProvider } from '@/ui/theme';`
2. In `RootLayoutReady`'s returned JSX, wrap the `<SafeAreaProvider>` subtree:

```tsx
  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
```

> `ThemeProvider` reads the settings store, so it must live inside `RootLayoutReady` (which only renders after settings are initialized). `BootSpinner`/`BootError` keep using the static `colors` — correct, they render before the theme exists.

- [ ] **Step 2: Theme the tab bar options**

In `app/(tabs)/_layout.tsx`, switch the static `colors` for the hook so the tab bar/header re-color with the mode. Replace the import and add the hook call at the top of `TabsLayout`:

```tsx
import { useTheme } from '@/ui/theme';
import { fontSize, fontFamily } from '@/ui/theme';
// ...
export default function TabsLayout(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);
  // ...rest unchanged; `colors.primary` etc. now come from the hook
```

> Leave the rest of the file as-is — `screenOptions` already reads `colors.*`, now sourced from `useTheme()`.

- [ ] **Step 3: Type-check + boot**

Run: `npx tsc --noEmit`
Expected: PASS.
Run: `npx expo start` and open the app; existing tabs still render (evergreen for existing installs).

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx app/\(tabs\)/_layout.tsx
git commit -m "feat: mount theme provider and theme the tab bar"
```

---

## Task 11: Theme — convert shared primitives to `useTheme()`

Because screens compose primitives, converting the primitives that use **theme-varying** tokens re-skins ~90% of visible surface. The conversion is mechanical: read colors from the hook, build the StyleSheet per-render via a `makeStyles(colors)` factory memoized on `colors`.

**Theme-varying tokens** (a primitive needs conversion iff it references one): `primary`, `primaryDark`, `primaryLight`, `background`, `surface`, `surfaceMuted`, `border`, `borderStrong`, `inRange`, `inRangeBg`, `inRangeText`, `success`.

**Files (candidates):** `src/ui/components/ui/{button,chip,segmented-control,toggle,stepper,badge,notice,icon-tile,section-label,app-text,card,screen-header}.tsx`.

- [ ] **Step 1: Identify exactly which primitives to convert**

Run: `rg --color=never --no-heading -l "colors\.(primary|primaryDark|primaryLight|background|surface|surfaceMuted|border|borderStrong|inRange|inRangeBg|inRangeText|success)" src/ui/components/ui`

Convert every file the command lists. (Files that only use constant tokens like `card`, `text`, `textMuted`, `accent*`, `high`, `low` need no change.)

- [ ] **Step 2: Apply this exact transform to each listed primitive**

The pattern (4 steps per file):
1. Remove `colors` from the `@/ui/theme` import; add `import { useTheme, type ColorScheme } from '@/ui/theme';` (keep `radius`, `spacing`, `fontSize`, etc.).
2. Inside the component, add `const colors = useTheme();` and `const styles = useMemo(() => makeStyles(colors), [colors]);` (add `useMemo` to the React import).
3. Rename the module-level `const styles = StyleSheet.create({...})` to `const makeStyles = (colors: ColorScheme) => StyleSheet.create({...})`.
4. If a module-level helper reads `colors` (e.g. Button's `backgroundFor`/`foregroundFor`), move it inside the component or give it a `colors: ColorScheme` parameter.

**Worked reference — `src/ui/components/ui/button.tsx` fully converted:**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type ReactElement } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fontSize, radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { AppText } from './app-text';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'dangerOutline';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  isLoading?: boolean;
  disabled?: boolean;
  uppercase?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
}

const SOLID: readonly ButtonVariant[] = ['primary', 'accent'];

function backgroundFor(variant: ButtonVariant, colors: ColorScheme): string {
  switch (variant) {
    case 'primary':
      return colors.primaryButton;
    case 'accent':
      return colors.primary;
    default:
      return 'transparent';
  }
}

function foregroundFor(variant: ButtonVariant, colors: ColorScheme): string {
  switch (variant) {
    case 'primary':
    case 'accent':
      return colors.onPrimaryButton;
    case 'dangerOutline':
      return colors.error;
    default:
      return colors.primary;
  }
}

/** Full-width pill button. Presentational — logic lives in the caller. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  isLoading = false,
  disabled = false,
  uppercase,
  accessibilityLabel,
  accessibilityRole = 'button',
  style,
}: ButtonProps): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = disabled || isLoading;
  const fg = foregroundFor(variant, colors);
  const isSolid = SOLID.includes(variant);
  const caps = uppercase ?? isSolid;

  const containerStyle: ViewStyle = {
    backgroundColor: backgroundFor(variant, colors),
    ...(variant === 'dangerOutline' && { borderWidth: 1.5, borderColor: colors.error }),
  };

  return (
    <TouchableOpacity
      style={[styles.base, containerStyle, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={fg} style={styles.icon} />
        ) : (
          icon && <Ionicons name={icon} size={22} color={fg} style={styles.icon} />
        )}
        <AppText
          variant="body"
          weight="extrabold"
          color={fg}
          style={[styles.label, caps && styles.caps]}
        >
          {caps ? label.toUpperCase() : label}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (_colors: ColorScheme) =>
  StyleSheet.create({
    base: {
      minHeight: 56,
      borderRadius: radius.pill,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    disabled: { opacity: 0.5 },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    icon: { marginRight: spacing.sm },
    label: { fontSize: fontSize.base },
    caps: { letterSpacing: 0.5 },
  });
```

> Button's StyleSheet uses no color (colors are applied inline via `containerStyle`/`fg`), so `makeStyles` ignores `colors` here (`_colors`). Other primitives (e.g. Chip, SegmentedControl, Toggle) DO use color inside `StyleSheet.create` — for those, reference `colors.*` inside `makeStyles` and drop the underscore.

- [ ] **Step 3: Type-check after each file**

Run: `npx tsc --noEmit`
Expected: PASS. Fix any missed `colors` reference (it will error as undefined).

- [ ] **Step 4: Verify no primitive still statically imports the varying tokens**

Run: `rg --color=never --no-heading -n "import .*\bcolors\b.* from '@/ui/theme'" src/ui/components/ui`
Expected: only files that use exclusively constant tokens remain (that's fine). Primitives converted in Step 2 should now import `useTheme` instead.

- [ ] **Step 5: Run tests + boot**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. Existing primitive tests (if any) still pass. Boot the app; existing screens render unchanged in evergreen.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/ui
git commit -m "feat: primitives read colors from useTheme"
```

---

## Task 12: Onboarding v2 — welcome → condition → gdm

Rewrite `app/onboarding.tsx` as a 3-step flow. Reuses existing primitives. Because `ThemeProvider` is driven by `conditionType`, selecting "Gestational" flips the theme to rose live (matching the design). Skip / "Daily tracking" applies the general preset.

**Files:**
- Modify: `app/onboarding.tsx`

- [ ] **Step 1: Replace `app/onboarding.tsx` entirely**

```tsx
import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AfterMealProtocol, CONDITION_PRESETS, ConditionType } from '@/domain/models/condition';
import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { AppText, Button, Card, IconTile, SectionLabel, SegmentedControl } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { radius, spacing, useTheme } from '@/ui/theme';
import { formatValue } from '@/ui/utils/format';

type Step = 'welcome' | 'condition' | 'gdm';

interface Feature {
  key: 'log' | 'trends' | 'export' | 'offline';
  color: string;
  fg: string;
}

export default function OnboardingScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { preferredUnit, preferredLanguage, updateSetting, applyConditionPreset } =
    useSettingsStore();

  const [step, setStep] = useState<Step>('welcome');
  const [protocol, setProtocol] = useState<AfterMealProtocol>(AfterMealProtocol.OneHour);
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 70); // ~10 weeks out — sensible default
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  const FEATURES: readonly Feature[] = [
    { key: 'log', color: colors.accentBlue, fg: colors.onPrimary },
    { key: 'trends', color: colors.accentPurple, fg: colors.onPrimary },
    { key: 'export', color: colors.accentAmber, fg: colors.text },
    { key: 'offline', color: colors.accentOrange, fg: colors.onPrimary },
  ];

  const gestPreset = CONDITION_PRESETS.gestational;

  // --- flow handlers ---
  const finishGeneral = async (): Promise<void> => {
    await applyConditionPreset(ConditionType.General);
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  const skip = async (): Promise<void> => {
    await updateSetting('preferredLanguage', Language.Vietnamese);
    await updateSetting('preferredUnit', Unit.MgDl);
    await finishGeneral();
  };

  const pickGestational = async (): Promise<void> => {
    // Persist conditionType now so the theme previews rose on the gdm step.
    await updateSetting('conditionType', ConditionType.Gestational);
    setStep('gdm');
  };

  const backFromGdm = async (): Promise<void> => {
    await updateSetting('conditionType', ConditionType.General); // revert theme preview
    setStep('condition');
  };

  const finishGestational = async (): Promise<void> => {
    await applyConditionPreset(ConditionType.Gestational);
    await updateSetting('dueDate', dueDate.getTime());
    await updateSetting('afterMealProtocol', protocol);
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  const dueLabel = dueDate.toLocaleDateString(preferredLanguage === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const previewLine = buildPreview();
  function buildPreview(): string {
    const u = preferredUnit;
    const fasting = `${t('screens.onboarding.gdm.labels.fasting')} <${formatValue(gestPreset.fastingRange.high, u)}`;
    const a1 = `${t('screens.onboarding.gdm.labels.after1h')} <${formatValue(gestPreset.postMealRange.high, u)}`;
    const a2 = `${t('screens.onboarding.gdm.labels.after2h')} <${formatValue(gestPreset.postMeal2hRange?.high ?? 120, u)}`;
    if (protocol === AfterMealProtocol.TwoHours) return `${fasting} · ${a2} ${u}`;
    if (protocol === AfterMealProtocol.OneThenTwo) return `${fasting} · ${a1} · ${a2} ${u}`;
    return `${fasting} · ${a1} ${u}`;
  }

  const Dots = ({ active }: { active: 0 | 1 | 2 }): ReactElement => (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === active ? colors.primary : colors.surfaceMuted, width: i === active ? 24 : 8 },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ---------- WELCOME ---------- */}
        {step === 'welcome' && (
          <>
            <View style={styles.headerRow}>
              <Dots active={0} />
              <Button variant="ghost" label={t('screens.onboarding.skip')} onPress={() => void skip()} style={styles.skipBtn} />
            </View>

            <View style={styles.hero}>
              <IconTile icon="water" color={colors.primary} size={64} />
              <AppText variant="title">{t('app.name')}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {t('app.tagline')}
              </AppText>
            </View>

            <View style={styles.grid}>
              {FEATURES.map((f) => (
                <View key={f.key} style={[styles.featureCard, { backgroundColor: f.color }]}>
                  <AppText weight="extrabold" color={f.fg}>
                    {t(`screens.onboarding.features.${f.key}.title`)}
                  </AppText>
                  <AppText variant="caption" color={f.fg} style={styles.featureSub}>
                    {t(`screens.onboarding.features.${f.key}.subtitle`)}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={styles.pickerGroup}>
              <SectionLabel>{t('screens.onboarding.languageLabel')}</SectionLabel>
              <SegmentedControl
                segments={[
                  { value: Language.Vietnamese, label: t('screens.onboarding.languages.vi') },
                  { value: Language.English, label: t('screens.onboarding.languages.en') },
                ]}
                value={preferredLanguage}
                onChange={(v) => void updateSetting('preferredLanguage', v)}
              />
            </View>

            <View style={styles.pickerGroup}>
              <SectionLabel>{t('screens.onboarding.unitLabel')}</SectionLabel>
              <SegmentedControl
                segments={[
                  { value: Unit.MgDl, label: Unit.MgDl },
                  { value: Unit.MmolL, label: Unit.MmolL },
                ]}
                value={preferredUnit}
                onChange={(v) => void updateSetting('preferredUnit', v)}
              />
            </View>

            <AppText variant="caption" color={colors.textFaint} style={styles.disclaimer}>
              {t('common.disclaimer')}
            </AppText>

            <Button variant="primary" uppercase label={t('screens.onboarding.getStarted')} onPress={() => setStep('condition')} />
          </>
        )}

        {/* ---------- CONDITION SELECT ---------- */}
        {step === 'condition' && (
          <>
            <View style={styles.headerRow}>
              <BackButton onPress={() => setStep('welcome')} color={colors.text} border={colors.border} />
              <Dots active={1} />
              <View style={styles.headerSpacer} />
            </View>

            <AppText variant="title" style={styles.stepTitle}>
              {t('screens.onboarding.condition.title')}
            </AppText>

            <View style={styles.conditionList}>
              <ConditionCard
                icon="woman"
                title={t('screens.onboarding.condition.gestational.title')}
                subtitle={t('screens.onboarding.condition.gestational.subtitle')}
                onPress={() => void pickGestational()}
              />
              <ConditionCard
                icon="create"
                title={t('screens.onboarding.condition.general.title')}
                subtitle={t('screens.onboarding.condition.general.subtitle')}
                onPress={() => void finishGeneral()}
              />
            </View>

            <Button variant="ghost" label={t('screens.onboarding.skip')} onPress={() => void skip()} style={styles.centerGhost} />
          </>
        )}

        {/* ---------- GDM DETAIL ---------- */}
        {step === 'gdm' && (
          <>
            <View style={styles.headerRow}>
              <BackButton onPress={() => void backFromGdm()} color={colors.text} border={colors.border} />
              <Dots active={2} />
              <View style={styles.headerSpacer} />
            </View>

            <AppText variant="title" style={styles.stepTitle}>
              {t('screens.onboarding.gdm.title')}
            </AppText>

            <Card onPress={() => setShowPicker(true)} style={styles.dueCard}>
              <View style={styles.dueRow}>
                <IconTile icon="calendar" color={colors.primary} size={44} />
                <View style={styles.dueText}>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t('screens.onboarding.gdm.dueDateLabel')}
                  </AppText>
                  <AppText weight="black" variant="subtitle">
                    {dueLabel}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
              </View>
            </Card>

            {showPicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(_event, selected) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (selected) setDueDate(selected);
                }}
              />
            )}

            <SectionLabel style={styles.protocolLabel}>
              {t('screens.onboarding.gdm.protocolQuestion')}
            </SectionLabel>
            <View style={styles.protocolList}>
              {[AfterMealProtocol.OneHour, AfterMealProtocol.TwoHours, AfterMealProtocol.OneThenTwo].map(
                (p) => {
                  const active = protocol === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setProtocol(p)}
                      style={[
                        styles.protocolOption,
                        {
                          backgroundColor: colors.card,
                          borderColor: active ? colors.primary : colors.border,
                          borderWidth: active ? 2 : 1.5,
                        },
                      ]}
                    >
                      <AppText weight="extrabold" style={styles.protocolText}>
                        {t(`screens.onboarding.gdm.protocols.${p}`)}
                      </AppText>
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={active ? colors.primary : colors.textFaint}
                      />
                    </Pressable>
                  );
                },
              )}
            </View>

            <View style={[styles.previewBox, { backgroundColor: colors.surface }]}>
              <AppText variant="caption" weight="extrabold" color={colors.inRangeText}>
                {t('screens.onboarding.gdm.previewTitle')}
              </AppText>
              <AppText weight="extrabold" style={styles.previewLine}>
                {previewLine}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={styles.previewAdjust}>
                {t('screens.onboarding.gdm.previewAdjust')}
              </AppText>
            </View>

            <Button variant="primary" uppercase label={t('screens.onboarding.gdm.start')} onPress={() => void finishGestational()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackButton({ onPress, color, border }: { onPress: () => void; color: string; border: string }): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.backBtn, { borderColor: border }]}
    >
      <Ionicons name="arrow-back" size={20} color={color} />
    </Pressable>
  );
}

function ConditionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}): ReactElement {
  const colors = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.condCard}>
      <View style={styles.condRow}>
        <IconTile icon={icon} color={colors.primary} size={52} />
        <View style={styles.condText}>
          <AppText weight="extrabold" variant="subtitle">
            {title}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.condSub}>
            {subtitle}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 40 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 99 },
  skipBtn: { alignSelf: 'flex-end' },
  centerGhost: { alignSelf: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  hero: { alignItems: 'center', gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  featureCard: { flexGrow: 1, flexBasis: '45%', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  featureSub: { opacity: 0.85 },
  pickerGroup: { gap: spacing.sm },
  disclaimer: { textAlign: 'center', lineHeight: 20 },
  stepTitle: { marginTop: spacing.sm },
  conditionList: { gap: spacing.md },
  condCard: {},
  condRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  condText: { flex: 1 },
  condSub: { marginTop: 2, lineHeight: 18 },
  dueCard: {},
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dueText: { flex: 1 },
  protocolLabel: { marginTop: spacing.sm },
  protocolList: { gap: spacing.sm },
  protocolOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  protocolText: { flex: 1 },
  previewBox: { borderRadius: radius.lg, padding: spacing.lg },
  previewLine: { marginTop: 6, lineHeight: 24 },
  previewAdjust: { marginTop: 8 },
});
```

> If `AppText` has no `subtitle`/`title` variant or `weight="black"`, use the closest existing variant/weight — check `src/ui/components/ui/app-text.tsx` and adjust. If `IconTile` doesn't accept a `size` prop, drop it. Keep icons to valid Ionicons names (`woman`, `create`, `calendar`, `water`, `chevron-forward`, `arrow-back`, `radio-button-on/off`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS. (i18n keys added in Task 14 — the app compiles regardless, missing keys render the key string until Task 14.)

- [ ] **Step 3: Commit**

```bash
git add app/onboarding.tsx
git commit -m "feat: onboarding v2 with condition select and gdm detail"
```

---

## Task 13: Settings — "Chế độ theo dõi" row + tracking-mode screen

**Files:**
- Create: `app/(tabs)/settings/tracking-mode.tsx`
- Modify: `app/(tabs)/settings/index.tsx`

- [ ] **Step 1: Create the tracking-mode screen**

```tsx
import { useRouter } from 'expo-router';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ConditionType } from '@/domain/models/condition';
import { AppText, Card, IconTile } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { radius, spacing, useTheme } from '@/ui/theme';

export default function TrackingModeScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { conditionType, applyConditionPreset } = useSettingsStore();

  const choose = (next: ConditionType): void => {
    if (next === conditionType) {
      router.back();
      return;
    }
    Alert.alert(
      t('screens.settings.trackingMode.confirmTitle'),
      t('screens.settings.trackingMode.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.settings.trackingMode.confirm'),
          onPress: () => {
            void applyConditionPreset(next).then(() => router.back());
          },
        },
      ],
    );
  };

  const options: { key: ConditionType; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: ConditionType.Gestational, icon: 'woman' },
    { key: ConditionType.General, icon: 'create' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {options.map(({ key, icon }) => {
        const active = conditionType === key;
        return (
          <Card
            key={key}
            onPress={() => choose(key)}
            accessibilityLabel={t(`screens.settings.trackingMode.${key}.title`)}
            style={[styles.card, active && { borderWidth: 2, borderColor: colors.primary }]}
          >
            <View style={styles.row}>
              <IconTile icon={icon} color={colors.primary} size={52} />
              <View style={styles.text}>
                <AppText weight="extrabold" variant="subtitle">
                  {t(`screens.settings.trackingMode.${key}.title`)}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={styles.sub}>
                  {t(`screens.settings.trackingMode.${key}.subtitle`)}
                </AppText>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={active ? colors.primary : colors.textFaint}
              />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  sub: { marginTop: 2, lineHeight: 18 },
});
```

- [ ] **Step 2: Register the route title**

Check `app/(tabs)/settings/_layout.tsx` — it is a Stack. Add a `<Stack.Screen name="tracking-mode" options={{ title: t('screens.settings.trackingMode.title') }} />` following the exact pattern used by the existing `target-range`/`export`/`about` screen entries in that file (match their `options` shape).

- [ ] **Step 3: Add the Settings row**

In `app/(tabs)/settings/index.tsx`:
1. Import the type/label helper: add `import { ConditionType } from '@/domain/models/condition';` and pull `conditionType` from the store destructure (add `conditionType,` to the `useSettingsStore()` destructure).
2. Add a mode label just before `return`:

```ts
  const modeLabel =
    conditionType === ConditionType.Gestational
      ? t('screens.settings.index.trackingModeValues.gestational')
      : t('screens.settings.index.trackingModeValues.general');
```

3. Add a new `SettingRow` as the **first** child of the "preferences" `Card` (before the "unit" row):

```tsx
        <SettingRow
          icon="options"
          iconColor={colors.accentPurple}
          label={t('screens.settings.index.rows.trackingMode')}
          value={modeLabel}
          onPress={() => router.push('/(tabs)/settings/tracking-mode')}
        />
```

> Do NOT touch the "export" / "about" rows — the standalone Export screen stays this session (removal is Session 13). `colors` here is still the static import in `settings/index.tsx`; that is acceptable for this session (screen-level static colors are migrated to `useTheme()` as screens are touched — see the theme scope note). The row still renders and navigates correctly.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/settings/tracking-mode.tsx app/\(tabs\)/settings/index.tsx app/\(tabs\)/settings/_layout.tsx
git commit -m "feat: tracking mode setting with preset re-apply"
```

---

## Task 14: i18n — vi + en keys

**Files:**
- Modify: `src/i18n/vi.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add keys to `vi.json`**

Under `screens.onboarding`, add these keys (alongside the existing `features` etc.):

```json
      "condition": {
        "title": "Bạn đang theo dõi đường huyết cho ai?",
        "gestational": {
          "title": "Tiểu đường thai kỳ",
          "subtitle": "Đo 4 lần/ngày theo lịch bác sĩ dặn"
        },
        "general": {
          "title": "Theo dõi thường ngày",
          "subtitle": "Ghi đường huyết bất cứ khi nào bạn cần"
        }
      },
      "gdm": {
        "title": "Đôi điều về thai kỳ của bạn",
        "dueDateLabel": "Ngày dự sinh",
        "protocolQuestion": "Bác sĩ dặn đo sau ăn khi nào?",
        "protocols": {
          "1h": "1 giờ sau ăn",
          "2h": "2 giờ sau ăn",
          "1h+2h": "1 giờ, đo lại lúc 2 giờ nếu cao"
        },
        "labels": { "fasting": "Đói", "after1h": "Sau ăn 1h", "after2h": "2h" },
        "previewTitle": "Ngưỡng đặt theo chuẩn thai kỳ",
        "previewAdjust": "Điều chỉnh trong Cài đặt nếu bác sĩ dặn khác.",
        "start": "Bắt đầu theo dõi"
      }
```

Under `screens.settings.index.rows`, add:

```json
        "trackingMode": "Chế độ theo dõi"
```

Under `screens.settings.index`, add a sibling object to `rows`:

```json
      "trackingModeValues": {
        "gestational": "Thai kỳ",
        "general": "Thường ngày"
      }
```

Under `screens.settings`, add a sibling object (next to `targetRange`, `export`, etc.):

```json
    "trackingMode": {
      "title": "Chế độ theo dõi",
      "gestational": {
        "title": "Tiểu đường thai kỳ",
        "subtitle": "Ngưỡng thai kỳ + giao diện hồng"
      },
      "general": {
        "title": "Theo dõi thường ngày",
        "subtitle": "Ngưỡng mặc định + giao diện xanh"
      },
      "confirmTitle": "Đổi chế độ theo dõi?",
      "confirmMessage": "Ngưỡng mặc định và giao diện sẽ đổi theo chế độ mới — dữ liệu đã ghi giữ nguyên.",
      "confirm": "Đổi chế độ"
    }
```

- [ ] **Step 2: Add the mirror keys to `en.json`**

Same paths, English values:

```json
      "condition": {
        "title": "Who are you tracking blood sugar for?",
        "gestational": { "title": "Gestational diabetes", "subtitle": "Measure 4× a day on your doctor's schedule" },
        "general": { "title": "Daily tracking", "subtitle": "Log your blood sugar whenever you need" }
      },
      "gdm": {
        "title": "A little about your pregnancy",
        "dueDateLabel": "Expected delivery date",
        "protocolQuestion": "How long after meals did your doctor say to measure?",
        "protocols": { "1h": "1 hour after eating", "2h": "2 hours after eating", "1h+2h": "1 hour, re-check at 2 hours" },
        "labels": { "fasting": "Fasting", "after1h": "After 1h", "after2h": "2h" },
        "previewTitle": "Targets set to pregnancy guidelines",
        "previewAdjust": "Adjust in Settings if your doctor advised otherwise.",
        "start": "Start tracking"
      }
```

```json
        "trackingMode": "Tracking mode"
```

```json
      "trackingModeValues": { "gestational": "Gestational", "general": "Daily" }
```

```json
    "trackingMode": {
      "title": "Tracking mode",
      "gestational": { "title": "Gestational diabetes", "subtitle": "Pregnancy targets + rose theme" },
      "general": { "title": "Daily tracking", "subtitle": "Default targets + green theme" },
      "confirmTitle": "Change tracking mode?",
      "confirmMessage": "Default targets and the theme will change to the new mode — your saved readings are untouched.",
      "confirm": "Change mode"
    }
```

- [ ] **Step 3: Validate JSON**

Run: `node -e "require('./src/i18n/vi.json'); require('./src/i18n/en.json'); console.log('json ok')"`
Expected: `json ok` (no parse error). Confirm both files have the SAME key structure.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/vi.json src/i18n/en.json
git commit -m "feat: i18n for onboarding v2 and tracking mode"
```

---

## Task 15: Full verification + manual acceptance + final commit

- [ ] **Step 1: Type-check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: both PASS (0 type errors; all suites green, including the 4 new/extended domain suites).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (fix any lint issues introduced).

- [ ] **Step 3: Manual acceptance (boot the app)**

Run: `npx expo start` (use a device/emulator). Verify:
1. **Fresh install** (or Settings → delete all data → relaunch): onboarding shows welcome (dot 1) → "Get started" → condition (dot 2).
2. Tap **Gestational** → theme turns **rose**; gdm step (dot 3) shows due-date card, 3 protocol options, live preview line, "Start tracking". Pick a protocol → preview updates. Finish → lands in tabs, **rose** theme (tab bar active icon, buttons, chips are rose).
3. Settings → **Target ranges** shows fasting 70–95 and after-meal 70–140 (the gestational preset applied). (The 3rd "2h" card is a Session-13/Target-range enhancement — not required this session; confirm `postMeal2hRange` is stored via the round-trip below.)
4. Delete data → relaunch → onboarding → **Daily tracking** (or **Skip**): green theme, defaults 70–100 / 70–140 — **identical to before this session**.
5. Settings → **Chế độ theo dõi** row → open → switch mode → confirm dialog → theme + ranges change; open History → previously saved readings are all still there (no data loss).

- [ ] **Step 4: Verify no new migration was generated**

Run: `git status --porcelain drizzle`
Expected: empty (no new files under `drizzle/`). If a migration was generated by accident, delete it — settings are JSON kv and need none.

- [ ] **Step 5: Final commit (only if earlier per-task commits were squashed/skipped)**

If you committed per task, the work is already saved. Otherwise:

```bash
git add -A
git commit -m "feat: condition presets, onboarding v2, per-mode theme"
```

---

## Self-review notes (author checklist — already reconciled)

- **Spec coverage:** condition model + presets (T1), settings keys no-migration (T2), `evaluateReading` 2h + general-identical (T3), `pregnancyWeek` (T4), `getDaySlots` duplicates/Snack/followUp/tz (T5), theme presets + provider/hook (T8–T11), onboarding v2 3 steps + preset apply + skip (T12), settings mode switch + confirm (T13), i18n vi+en (T14). All Session-10 spec bullets map to a task.
- **Deliberately deferred (NOT this session):** Today tab (S12), reminders (S11), doctor-report/PDF + Export-screen removal + 3rd "2h" target card UI (S13). `getDaySlots`/`pregnancyWeek` are built + tested but unwired — S12 consumes them.
- **Theme scope (documented):** primitives + tab bar convert to `useTheme()` now; screen-level static `colors` (mostly near-white `background`) migrate as each screen is next touched. Brand-level rose is app-wide via the primitives, satisfying "app renders rose theme".
- **Type consistency:** `TargetRanges.postMeal2h?`, `AppSettings.postMeal2hRange: TargetRange | null`, `CONDITION_PRESETS[type].postMeal2hRange?: TargetRange`, and `applyConditionPreset` writes `preset.postMeal2hRange ?? null` — the `undefined` (preset/ranges) vs `null` (persisted setting) boundary is consistent across T1/T2/T3/T6.
```
