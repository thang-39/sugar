# Log Screen — Simplified Timing Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Log form's two-part meal-timing UI (Before/After toggle + a 0–6h chip grid) with a single 3-option segmented control — `Before meal` / `1h after` / `2h after` — while keeping the underlying `mealTiming` + `hoursAfterMeal` domain model unchanged.

**Architecture:** Introduce a pure mapping between a UI-only `TimingChoice` union (`'before' | 'after1' | 'after2'`) and the stored `{ mealTiming, hoursAfterMeal }` pair. The form holds one `timingChoice` state instead of separate `mealTiming` + `hoursAfterMeal` states; it maps to the domain fields only at save time. No changes to `create-reading`, `evaluate-reading`, DB schema, repository, CSV, or report code — they keep receiving `mealTiming` + numeric `hoursAfterMeal` (now restricted to `{1, 2}`). The collapsible notes UI already exists and is untouched.

**Tech Stack:** React Native, TypeScript (strict), i18next, existing `SegmentedControl` primitive, Jest.

---

## File Structure

- Create: `src/ui/utils/timing-choice.ts` — pure mapping helper + `TimingChoice` type.
- Create: `src/ui/utils/__tests__/timing-choice.test.ts` — unit tests for the mapping.
- Modify: `src/ui/components/log-reading-form.tsx` — swap timing state + UI.
- Modify: `src/i18n/en.json`, `src/i18n/vi.json` — add 3 timing-option labels.

The mapping lives in its own file (not inline in the component) so it is unit-testable and reusable by the edit screen (which renders the same form).

---

### Task 1: Timing-choice mapping helper

**Files:**
- Create: `src/ui/utils/timing-choice.ts`
- Test: `src/ui/utils/__tests__/timing-choice.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/utils/__tests__/timing-choice.test.ts
import { MealTiming } from '@/domain/models/meal';
import {
  timingChoiceToFields,
  fieldsToTimingChoice,
  type TimingChoice,
} from '@/ui/utils/timing-choice';

describe('timingChoiceToFields', () => {
  it('maps before to Before with no hours', () => {
    expect(timingChoiceToFields('before')).toEqual({
      mealTiming: MealTiming.Before,
      hoursAfterMeal: undefined,
    });
  });

  it('maps after1 to After + 1 hour', () => {
    expect(timingChoiceToFields('after1')).toEqual({
      mealTiming: MealTiming.After,
      hoursAfterMeal: 1,
    });
  });

  it('maps after2 to After + 2 hours', () => {
    expect(timingChoiceToFields('after2')).toEqual({
      mealTiming: MealTiming.After,
      hoursAfterMeal: 2,
    });
  });
});

describe('fieldsToTimingChoice', () => {
  it('returns before for Before timing', () => {
    expect(fieldsToTimingChoice(MealTiming.Before, undefined)).toBe('before');
  });

  it('returns after1 for After with 1 hour', () => {
    expect(fieldsToTimingChoice(MealTiming.After, 1)).toBe('after1');
  });

  it('returns after2 for After with 2+ hours', () => {
    expect(fieldsToTimingChoice(MealTiming.After, 2)).toBe('after2');
    expect(fieldsToTimingChoice(MealTiming.After, 3)).toBe('after2');
  });

  it('defaults legacy After readings with 0 hours to after1', () => {
    expect(fieldsToTimingChoice(MealTiming.After, 0)).toBe('after1');
    expect(fieldsToTimingChoice(MealTiming.After, undefined)).toBe('after1');
  });

  const choices: TimingChoice[] = ['before', 'after1', 'after2'];
  it.each(choices)('round-trips %s', (choice) => {
    const { mealTiming, hoursAfterMeal } = timingChoiceToFields(choice);
    expect(fieldsToTimingChoice(mealTiming, hoursAfterMeal)).toBe(choice);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/utils/__tests__/timing-choice.test.ts`
Expected: FAIL — `Cannot find module '@/ui/utils/timing-choice'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/ui/utils/timing-choice.ts
import { MealTiming } from '@/domain/models/meal';

/**
 * UI-only representation of meal timing. The domain model still stores
 * `mealTiming` + numeric `hoursAfterMeal`; this collapses the picker to the
 * three options the design exposes.
 */
export const TimingChoice = {
  Before: 'before',
  After1: 'after1',
  After2: 'after2',
} as const;
export type TimingChoice = (typeof TimingChoice)[keyof typeof TimingChoice];

export interface TimingFields {
  mealTiming: MealTiming;
  hoursAfterMeal: number | undefined;
}

/** Map a UI choice to the stored domain fields. */
export function timingChoiceToFields(choice: TimingChoice): TimingFields {
  switch (choice) {
    case TimingChoice.Before:
      return { mealTiming: MealTiming.Before, hoursAfterMeal: undefined };
    case TimingChoice.After1:
      return { mealTiming: MealTiming.After, hoursAfterMeal: 1 };
    case TimingChoice.After2:
      return { mealTiming: MealTiming.After, hoursAfterMeal: 2 };
  }
}

/** Derive the UI choice from stored fields (edit mode / legacy readings). */
export function fieldsToTimingChoice(
  mealTiming: MealTiming,
  hoursAfterMeal: number | undefined,
): TimingChoice {
  if (mealTiming === MealTiming.Before) return TimingChoice.Before;
  // After: any reading recorded at 2h+ maps to the 2h target range, everything
  // else (including legacy 0h / undefined) collapses to 1h.
  return hoursAfterMeal !== undefined && hoursAfterMeal >= 2
    ? TimingChoice.After2
    : TimingChoice.After1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/utils/__tests__/timing-choice.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/ui/utils/timing-choice.ts src/ui/utils/__tests__/timing-choice.test.ts
git commit -m "feat: add timing-choice mapping helper for simplified log timing"
```

---

### Task 2: Add the 3 timing-option i18n labels

**Files:**
- Modify: `src/i18n/en.json` (inside the `logForm` object, after `mealTimingLabel` at line 308)
- Modify: `src/i18n/vi.json` (same location)

- [ ] **Step 1: Add the English labels**

In `src/i18n/en.json`, add this key right after `"mealTimingLabel": "Timing",` (line 308):

```json
    "mealTimingOptions": {
      "before": "Before meal",
      "after1": "1h after",
      "after2": "2h after"
    },
```

- [ ] **Step 2: Add the Vietnamese labels**

In `src/i18n/vi.json`, add the matching key right after `"mealTimingLabel"` in the `logForm` block:

```json
    "mealTimingOptions": {
      "before": "Trước ăn",
      "after1": "Sau ăn 1h",
      "after2": "Sau ăn 2h"
    },
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./src/i18n/en.json'); require('./src/i18n/vi.json'); console.log('ok')"`
Expected: prints `ok` (no JSON parse error).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/vi.json
git commit -m "feat: add simplified timing option labels (vi+en)"
```

---

### Task 3: Swap the Log form timing UI to the 3-option control

**Files:**
- Modify: `src/ui/components/log-reading-form.tsx`

- [ ] **Step 1: Update imports**

At the import block, add the new helper. Replace the domain `MealTiming`-only import usage by keeping `MealTiming` (still used by `performSave`) and adding:

```ts
import {
  TimingChoice,
  timingChoiceToFields,
  fieldsToTimingChoice,
} from '@/ui/utils/timing-choice';
```

Remove the now-unused `AppText` timing caption? No — `AppText` is still used elsewhere; keep it. Keep `Chip` import (still used by meal-type grid).

- [ ] **Step 2: Replace timing state**

Delete the two state hooks at lines 108–113:

```ts
const [mealTiming, setMealTiming] = useState<MealTiming>(
  initialReading?.mealTiming ?? prefill?.mealTiming ?? MealTiming.Before,
);
const [hoursAfterMeal, setHoursAfterMeal] = useState(
  initialReading?.hoursAfterMeal ?? prefill?.hoursAfterMeal ?? 2,
);
```

Replace with a single choice state:

```ts
const [timingChoice, setTimingChoice] = useState<TimingChoice>(() => {
  const timing = initialReading?.mealTiming ?? prefill?.mealTiming;
  if (timing === undefined) return TimingChoice.Before;
  return fieldsToTimingChoice(timing, initialReading?.hoursAfterMeal ?? prefill?.hoursAfterMeal);
});
```

- [ ] **Step 3: Delete the `HOUR_OPTIONS` constant**

Remove line 61:

```ts
const HOUR_OPTIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];
```

- [ ] **Step 4: Update `resetForm`**

In `resetForm` (lines 177–188), replace the two timing resets:

```ts
setMealTiming(MealTiming.Before);
setHoursAfterMeal(2);
```

with:

```ts
setTimingChoice(TimingChoice.Before);
```

- [ ] **Step 5: Update `performSave` to derive domain fields**

In `performSave` (lines 213–223), replace the inline `mealTiming` / `hoursAfterMeal` usage. Change the `input` object to:

```ts
const { mealTiming, hoursAfterMeal } = timingChoiceToFields(timingChoice);
const input = {
  value: mgdl,
  mealType,
  mealTiming,
  hoursAfterMeal,
  notes: notes.trim() || undefined,
  recordedAt: recordedAt.getTime(),
};
```

(`timingChoiceToFields` already returns `hoursAfterMeal: undefined` for `before`, so the previous `mealTiming === After ? ... : undefined` guard is no longer needed.)

- [ ] **Step 6: Replace the timing SegmentedControl + hours grid JSX**

Replace the whole block from line 348 (`{/* Before / After Meal Timing Switch */}`) through line 392 (end of the `{mealTiming === MealTiming.After && (...)}` block) with:

```tsx
{/* Timing — Before meal / 1h after / 2h after */}
<SectionLabel style={styles.timingLabel}>{t('logForm.mealTimingLabel')}</SectionLabel>
<SegmentedControl
  value={timingChoice}
  onChange={setTimingChoice}
  activeColor={colors.primaryButton}
  segments={[
    {
      value: TimingChoice.Before,
      label: t('logForm.mealTimingOptions.before'),
      accessibilityLabel: t('logForm.a11y.timingToggle', {
        timing: t('logForm.mealTimingOptions.before'),
      }),
    },
    {
      value: TimingChoice.After1,
      label: t('logForm.mealTimingOptions.after1'),
      accessibilityLabel: t('logForm.a11y.timingToggle', {
        timing: t('logForm.mealTimingOptions.after1'),
      }),
    },
    {
      value: TimingChoice.After2,
      label: t('logForm.mealTimingOptions.after2'),
      accessibilityLabel: t('logForm.a11y.timingToggle', {
        timing: t('logForm.mealTimingOptions.after2'),
      }),
    },
  ]}
  style={styles.timing}
/>
```

- [ ] **Step 7: Remove now-unused styles**

In `makeStyles`, delete the `hoursSection` and `hoursGrid` style entries (lines 545–553). Leave `timingLabel` and `timing` — they are still used.

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (If `MealTiming` is now unused, remove it from the import at line 17; if `AppText` became unused, remove it — `tsc` with the project's `noUnusedLocals` will flag either. `AppText` is still used by the date button, so it stays.)

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: PASS — no existing test asserted on the removed hours chip UI; domain tests are unaffected because the stored model is unchanged.

- [ ] **Step 10: Manual verification**

Run: `npx expo start`. On the Log tab:
- Confirm the Timing row shows three segments: `Before meal`, `1h after`, `2h after`.
- Select `1h after`, save a reading, open it in History → detail should read "1 hour(s) after meal" (detail plan handles the label; here just confirm timing persisted as After/1).
- Select `2h after`, save → persists as After/2.
- Edit an existing "After, 2h" reading → the `2h after` segment is preselected.

- [ ] **Step 11: Commit**

```bash
git add src/ui/components/log-reading-form.tsx
git commit -m "feat: simplify log timing to Before/1h/2h segmented control"
```

---

## Self-Review Notes

- **Spec coverage:** timing 3-option control (Task 3), model unchanged (helper maps to existing fields, Task 1), collapsible notes already present (no task needed).
- **Edit mode:** `fieldsToTimingChoice` handles preselection incl. legacy `hoursAfterMeal` values 0/3–6 → `after1`/`after2` without data loss.
- **No schema/DB/CSV/report change** — verified those consume `mealTiming` + numeric `hoursAfterMeal`, which this still provides (values restricted to `{1,2}`).
