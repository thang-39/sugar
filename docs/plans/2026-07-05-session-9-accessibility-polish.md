# Session 9 — Accessibility & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every screen usable by an elderly, low-vision, or screen-reader user — verified contrast, capped font-scaling that never clips, haptic + visual save feedback, complete a11y labels, and a real (non-template) Evergreen app icon + splash.

**Architecture:** Session 9 is a polish pass — no domain/data changes. Two testable anchors get TDD (a WCAG contrast utility that locks in status-color contrast, and a haptics wrapper). Everything else is audit-and-fix against existing primitives plus a manual screen-reader / 1.3×-font-scale walkthrough. All new user-facing strings go through i18n (`vi.json` + `en.json`).

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript strict, `expo-haptics` (new dep), Jest + RNTL, Ionicons, i18next. Design source of truth: `design/Sugar App.dc.html` (Evergreen). Theme tokens: `src/ui/theme`.

**PRD/PLAN scope (Session 9):** story 52 + elderly-first goal — audit every screen at 1.3× font scale (no clipping), `accessibilityLabel`/`Role` on all interactive elements, contrast check on badges/chart colors, haptic + visual feedback on save, loading/empty/error states everywhere, app icon + splash (simple, high-contrast). **Accept:** VoiceOver/TalkBack can complete log→history→export. Commit: `feat: accessibility and ui polish`.

---

## Current State (verified before planning)

Already in place — **do not re-do**:
- All shared primitives (`Button`, `Chip`, `SegmentedControl`, `Stepper`, `Toggle`, `Badge`, `SettingRow`, `ReadingListItem`) already set `accessibilityRole`, `accessibilityState`, and `accessibilityLabel`.
- `logForm`, `history`, `settings.targetRange`, `trends.customRange` already have `a11y.*` i18n strings.
- Loading/empty/error states already exist in `trends.tsx`, `history/index.tsx`, `export.tsx`, `history/[id]/index.tsx` (via `useReadings`/`useReading` `isLoading`/`error`, `ActivityIndicator`, empty blocks).

Confirmed gaps this session closes:
- **No haptics anywhere** (`expo-haptics` not installed; zero `Haptics` references).
- **Contrast defect:** `statusColor(Low)` returns `colors.low` = amber `#F5B301`, used as **text color** in `reading-list-item.tsx:62` on a white card ≈ 1.8:1 (WCAG needs ≥3:1 large, ≥4.5:1 small). Badge orange-on-peach at 13px also fails 4.5:1. (`colors.ts` header explicitly defers "verify contrast ratios formally" to Session 9.)
- **No `maxFontSizeMultiplier`** anywhere; `display: 44` value input and `title: 24` headings can clip/overflow at ≥1.3× scale.
- **App icon + splash** are still the default Expo template (blue splash `#208AEF`, android bg `#E6F4FE`) — not Evergreen.

---

## File Structure

Files created:
- `src/ui/utils/contrast.ts` — pure WCAG relative-luminance + contrast-ratio helpers.
- `src/ui/utils/__tests__/contrast.test.ts` — locks status-text contrast ≥ threshold.
- `src/ui/utils/haptics.ts` — thin `expo-haptics` wrapper (`success` / `warning` / `error` / `selection`), no-throw.
- `src/ui/utils/__tests__/haptics.test.ts` — asserts each helper calls the right native API.
- `assets/images/icon.svg` — Evergreen 1024² source art (checked in; PNG is generated from it).

Files modified:
- `src/ui/theme/colors.ts` — add contrast-safe status **text** tokens (`inRangeText`, `lowText`, `highText`).
- `src/ui/utils/reading-display.ts` — `statusColor` returns the new text-safe tokens; add `statusBadge(evaluation)` helper for badge fg/bg.
- `src/ui/components/reading-list-item.tsx` — badge uses per-status color/bg.
- `src/ui/components/ui/app-text.tsx` — cap `maxFontSizeMultiplier` on oversized variants.
- `src/ui/components/log-reading-form.tsx` — haptics on save/warn/error; cap value-input scaling.
- `app/(tabs)/settings/index.tsx` — haptic on the delete-all destructive confirm.
- `src/ui/components/blood-sugar-chart.tsx` — `accessibilityLabel` summarizing the chart.
- `app/(tabs)/settings/about.tsx` — `accessibilityRole="link"` on the privacy link.
- `src/i18n/vi.json`, `src/i18n/en.json` — new a11y strings.
- `app.json` — Evergreen splash bg + android adaptive bg colors.
- `package.json` — `expo-haptics` dependency.

Out of scope (later sessions / deferred): dark mode, EAS build config + store assets (Session 10).

---

## Task 1: WCAG contrast utility (TDD)

**Files:**
- Create: `src/ui/utils/contrast.ts`
- Test: `src/ui/utils/__tests__/contrast.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/utils/__tests__/contrast.test.ts
import { contrastRatio, relativeLuminance } from '@/ui/utils/contrast';

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('is 1 for a color against itself', () => {
    expect(contrastRatio('#0FA36B', '#0FA36B')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#1B2B24', '#F7FBF8')).toBeCloseTo(
      contrastRatio('#F7FBF8', '#1B2B24'),
      5,
    );
  });

  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/utils/__tests__/contrast.test.ts`
Expected: FAIL — "Cannot find module '@/ui/utils/contrast'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/utils/contrast.ts
/**
 * WCAG 2.1 contrast helpers (pure). Used by the Session 9 accessibility audit
 * to prove status/badge colors meet minimum contrast on their backgrounds.
 */

function expand(hex: string): string {
  const h = hex.replace('#', '');
  return h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a hex color in [0, 1]. */
export function relativeLuminance(hex: string): number {
  const h = expand(hex);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colors, in [1, 21]. Order-independent. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/utils/__tests__/contrast.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/utils/contrast.ts src/ui/utils/__tests__/contrast.test.ts
git commit -m "test: add WCAG contrast utility"
```

---

## Task 2: Contrast-safe status colors (TDD — this test SHOULD fail on today's tokens)

**Files:**
- Modify: `src/ui/theme/colors.ts`
- Modify: `src/ui/utils/reading-display.ts:5-14` (`statusColor`) and add `statusBadge`
- Modify: `src/ui/components/reading-list-item.tsx:68`
- Test: `src/ui/utils/__tests__/reading-display.test.ts` (create)

- [ ] **Step 1: Write the failing test**

The threshold is 4.5:1 (WCAG AA normal text) because status colors are used at small sizes too (the 13px badge). Card background is `colors.card` (`#FFFFFF`).

```ts
// src/ui/utils/__tests__/reading-display.test.ts
import { RangeEvaluation } from '@/domain/models/target-range';
import { colors } from '@/ui/theme';
import { contrastRatio } from '@/ui/utils/contrast';
import { statusBadge, statusColor } from '@/ui/utils/reading-display';

const AA_NORMAL = 4.5;

describe('statusColor contrast on white card', () => {
  const cases = [RangeEvaluation.InRange, RangeEvaluation.Low, RangeEvaluation.High];
  it.each(cases)('%s status text meets AA on card', (evaluation) => {
    expect(contrastRatio(statusColor(evaluation), colors.card)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('statusBadge text-on-tint contrast', () => {
  const cases = [RangeEvaluation.InRange, RangeEvaluation.Low, RangeEvaluation.High];
  it.each(cases)('%s badge text meets AA on its tint', (evaluation) => {
    const { color, backgroundColor } = statusBadge(evaluation);
    expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/utils/__tests__/reading-display.test.ts`
Expected: FAIL — `InRange`/`Low`/`High` fall below 4.5 (amber `#F5B301` ≈ 1.8, orange ≈ 3.3, green ≈ 3.3).

- [ ] **Step 3: Add contrast-safe text tokens**

In `src/ui/theme/colors.ts`, add to the `palette` object (after `orange`):

```ts
  // Darkened status shades — used for TEXT/badges so small labels meet WCAG AA.
  greenText: '#0A7350',
  amberText: '#8A5D00',
  orangeText: '#B23C10',
```

Then in the `colors` export, inside the "Blood-sugar status" block, add:

```ts
  // Status TEXT colors (contrast-safe on white/tinted backgrounds; see contrast.test)
  inRangeText: palette.greenText,
  lowText: palette.amberText,
  highText: palette.orangeText,
```

- [ ] **Step 4: Point `statusColor` at the text tokens and add `statusBadge`**

Replace the body of `src/ui/utils/reading-display.ts` with:

```ts
import { RangeEvaluation } from '@/domain/models/target-range';
import { colors } from '@/ui/theme';

/** Contrast-safe foreground/text color for a target-range evaluation. */
export function statusColor(evaluation: RangeEvaluation): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.lowText;
    case RangeEvaluation.High:
      return colors.highText;
    default:
      return colors.inRangeText;
  }
}

/** Soft background tint matching {@link statusColor}. */
export function statusBgColor(evaluation: RangeEvaluation): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.lowBg;
    case RangeEvaluation.High:
      return colors.highBg;
    default:
      return colors.inRangeBg;
  }
}

/** Badge foreground + background pair for a status pill (contrast-safe). */
export function statusBadge(evaluation: RangeEvaluation): {
  color: string;
  backgroundColor: string;
} {
  return { color: statusColor(evaluation), backgroundColor: statusBgColor(evaluation) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/ui/utils/__tests__/reading-display.test.ts`
Expected: PASS (6 cases). If any status still fails, darken the corresponding `*Text` token by ~10% and re-run — do not lower the 4.5 threshold.

- [ ] **Step 6: Use the badge pair in the history row**

In `src/ui/components/reading-list-item.tsx`, add `statusBadge` to the import on line 16:

```ts
import { statusBadge, statusColor } from '@/ui/utils/reading-display';
```

Replace line 68:

```tsx
          {isOutOfRange && (
            <Badge label={t(`status.${evaluation}`).toUpperCase()} {...statusBadge(evaluation)} />
          )}
```

- [ ] **Step 7: Verify the app still type-checks and full suite is green**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/ui/theme/colors.ts src/ui/utils/reading-display.ts \
  src/ui/utils/__tests__/reading-display.test.ts src/ui/components/reading-list-item.tsx
git commit -m "fix: contrast-safe status colors for values and badges"
```

---

## Task 3: Haptics wrapper (TDD)

**Files:**
- Modify: `package.json` (add `expo-haptics`)
- Create: `src/ui/utils/haptics.ts`
- Test: `src/ui/utils/__tests__/haptics.test.ts`

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-haptics`
Expected: `expo-haptics` added to `package.json` dependencies at an SDK-54-compatible version.

- [ ] **Step 2: Write the failing test**

`expo-haptics` is mocked so the test runs on CI without native code.

```ts
// src/ui/utils/__tests__/haptics.test.ts
import * as Haptics from 'expo-haptics';
import { haptics } from '@/ui/utils/haptics';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('haptics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('success → Success notification', async () => {
    await haptics.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('warning → Warning notification', async () => {
    await haptics.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('error → Error notification', async () => {
    await haptics.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('selection → selectionAsync', async () => {
    await haptics.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('never rejects even if the native call throws', async () => {
    (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(new Error('no haptics'));
    await expect(haptics.success()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/ui/utils/__tests__/haptics.test.ts`
Expected: FAIL — "Cannot find module '@/ui/utils/haptics'".

- [ ] **Step 4: Write minimal implementation**

```ts
// src/ui/utils/haptics.ts
import * as Haptics from 'expo-haptics';

/**
 * Thin, never-throwing wrapper over expo-haptics. Haptics are a progressive
 * enhancement — a device without a taptic engine (or the web build) must never
 * crash, so every call swallows its own errors.
 */
async function safe(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // Haptics unavailable on this device/platform — ignore.
  }
}

export const haptics = {
  success: (): Promise<void> =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: (): Promise<void> =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: (): Promise<void> =>
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  selection: (): Promise<void> => safe(() => Haptics.selectionAsync()),
} as const;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/ui/utils/__tests__/haptics.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/ui/utils/haptics.ts src/ui/utils/__tests__/haptics.test.ts
git commit -m "feat: add never-throwing haptics wrapper"
```

---

## Task 4: Wire haptics into save + destructive flows

**Files:**
- Modify: `src/ui/components/log-reading-form.tsx`
- Modify: `app/(tabs)/settings/index.tsx`

- [ ] **Step 1: Import haptics into the log form**

In `src/ui/components/log-reading-form.tsx`, add after the `format` import (line 30):

```ts
import { haptics } from '@/ui/utils/haptics';
```

- [ ] **Step 2: Fire success/error haptics inside `performSave`**

In `performSave` (lines 200-228), fire a success haptic right before showing the saved alert, and an error haptic in the catch. Replace the body:

```ts
  const performSave = async (mgdl: number): Promise<void> => {
    try {
      setIsSaving(true);
      const input = {
        value: mgdl,
        mealType,
        mealTiming,
        hoursAfterMeal: mealTiming === MealTiming.After ? hoursAfterMeal : undefined,
        notes: notes.trim() || undefined,
        recordedAt: recordedAt.getTime(),
      };
      // updateReading preserves createdAt and bumps updatedAt; createReading stamps both.
      const reading =
        initialReading !== undefined
          ? await updateReading(initialReading.id, input, readingUseCaseDeps())
          : await createReading(input, readingUseCaseDeps());

      const evaluation = evaluateReading(reading, {
        fasting: fastingRange,
        postMeal: postMealRange,
      });
      // Out-of-range success still saved — warn haptic; in-range → success.
      void (evaluation === RangeEvaluation.InRange ? haptics.success() : haptics.warning());
      showSavedAlert(reading, evaluation);
    } catch (err) {
      console.error('Failed to save reading:', err);
      void haptics.error();
      Alert.alert(t('common.errorTitle'), t('common.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };
```

- [ ] **Step 3: Fire a warning haptic when the out-of-bounds confirm appears**

In `onSave` (lines 230-253), add a warning haptic just before the out-of-bounds `Alert.alert`:

```ts
    const { mgdl, withinNormalRange } = validation;
    if (!withinNormalRange) {
      void haptics.warning();
      // Value is numeric but outside physical bounds — warn-only, never hard-block.
      Alert.alert(t('logForm.alerts.outOfBoundsTitle'), t('logForm.alerts.outOfBoundsMessage'), [
```

- [ ] **Step 4: Fire an error/warning haptic on the delete-all destructive step**

Open `app/(tabs)/settings/index.tsx`, find the second-step (final) delete-all confirm handler. Add the haptics import alongside the other `@/ui/utils` imports:

```ts
import { haptics } from '@/ui/utils/haptics';
```

At the start of the function that actually performs the wipe (the `onPress` for the final "Delete all" button — the one that calls the clear-all use case), add:

```ts
      void haptics.warning();
```

(If the delete succeeds it navigates away; if it fails and shows `deleteAll.failed`, add `void haptics.error();` before that `Alert.alert` too.)

- [ ] **Step 5: Manually verify feedback on a device/simulator**

Run: `npx expo start` → open on a physical device (haptics are silent on simulators).
Expected: saving an in-range reading gives a light success tap; an out-of-range save gives a warning buzz; a failed save (e.g. airplane-mode DB error is not reproducible, so trust the unit-tested path) would buzz error. Visual feedback (the existing saved `Alert`) still shows.

- [ ] **Step 6: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/ui/components/log-reading-form.tsx app/(tabs)/settings/index.tsx
git commit -m "feat: haptic feedback on save and destructive actions"
```

---

## Task 5: Cap font-scaling on oversized text (no clipping at 1.3×+)

`allowFontScaling` stays ON everywhere (CLAUDE.md rule). We only cap the *huge* variants so a very large system font can't overflow a single-line hero number, while body text keeps scaling fully.

**Files:**
- Modify: `src/ui/components/ui/app-text.tsx`
- Modify: `src/ui/components/log-reading-form.tsx` (the raw `TextInput` value field)

- [ ] **Step 1: Add per-variant scale caps in `AppText`**

In `src/ui/components/ui/app-text.tsx`, add a cap map above the component and apply it. The big display/title numbers cap at 1.3×; everything else stays uncapped (undefined = full scaling).

Add after the `styles` usage import block (near line 4):

```ts
import type { TextVariant } from './app-text'; // (already the file's own type — see below)
```

Actually keep it in-file — insert this constant just above `export function AppText`:

```ts
/**
 * Max font-scale multiplier per variant. Huge single-line hero text (the value
 * display, screen titles, stat numbers) caps at 1.3× so it never clips; body,
 * label, and caption text stay uncapped for full accessibility scaling.
 */
const MAX_SCALE: Partial<Record<TextVariant, number>> = {
  display: 1.3,
  title: 1.4,
  heading: 1.5,
};
```

Then update the returned `<Text>` to pass the cap:

```tsx
  return (
    <Text
      style={[styles[variant], override, style]}
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      {...rest}
    >
      {children}
    </Text>
  );
```

Note: `{...rest}` is spread *after* `maxFontSizeMultiplier`, so a caller can still override it explicitly on any single instance.

- [ ] **Step 2: Cap the raw value `TextInput` in the log form**

The value input is a raw `TextInput` (not `AppText`) at `fontSize.display` (44). In `src/ui/components/log-reading-form.tsx`, add `maxFontSizeMultiplier={1.3}` to the value `TextInput` (around line 264):

```tsx
          <TextInput
            style={styles.valueInput}
            value={valueStr}
            maxFontSizeMultiplier={1.3}
            onChangeText={(text) => {
```

- [ ] **Step 3: Verify existing AppText tests (if any) and type-check**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass (no AppText unit test exists, so this is a compile/regression check).

- [ ] **Step 4: Manual 1.3× (and 1.5×) audit — every screen**

Set the OS font size to the largest step (iOS: Settings → Accessibility → Display & Text Size → Larger Text, near max; Android: Settings → Display → Font size, max). Then walk each screen and confirm no clipped/overlapping text and no horizontal overflow:

- [ ] Log form: value + unit suffix on one row, meal chips wrap, Save button label fits.
- [ ] History list: value/badge row wraps (already `flexWrap`), date column not crushed.
- [ ] History detail + edit.
- [ ] Trends: 3 stat tiles — the numbers (`StatCard` value 22px) and 11.5px labels must not truncate; if a label clips, bump `StatCard` label to `numberOfLines={2}` or reduce padding.
- [ ] Settings index / target-range / export / about.
- [ ] Onboarding.

Fix any clip inline (add `numberOfLines`/`flexShrink`/wrap as needed) and note the fix in the commit body.

- [ ] **Step 5: Commit**

```bash
git add src/ui/components/ui/app-text.tsx src/ui/components/log-reading-form.tsx
git commit -m "feat: cap font-scaling on hero text to prevent clipping at large sizes"
```

---

## Task 6: Accessibility label audit — remaining interactive/informational elements

Most controls are already labeled via primitives. This task closes the specific holes and adds the missing i18n strings.

**Files:**
- Modify: `src/i18n/vi.json`, `src/i18n/en.json`
- Modify: `src/ui/components/blood-sugar-chart.tsx`
- Modify: `app/(tabs)/settings/about.tsx`

- [ ] **Step 1: Add a11y i18n strings (both locales)**

In `src/i18n/en.json`, add a `chart` a11y string under `trends` and a `privacyPolicy` role hint. Add to the `trends` object:

```json
    "a11y": {
      "chart": "Blood sugar trend chart. {{count}} points. Average {{avg}} {{unit}}."
    }
```

Under `screens.settings.about`, ensure a label exists for the link (reuse `privacyPolicy`). In `src/i18n/vi.json`, mirror with translations:

```json
    "a11y": {
      "chart": "Biểu đồ xu hướng đường huyết. {{count}} điểm. Trung bình {{avg}} {{unit}}."
    }
```

(Place `trends.a11y.chart` alongside the existing `trends.scales`/`trends.empty` keys in each file. Keep JSON valid — watch trailing commas.)

- [ ] **Step 2: Give the chart an accessible summary**

In `src/ui/components/blood-sugar-chart.tsx`, wrap the chart's outermost `View` with an accessibility summary so a screen reader announces the trend instead of reading raw SVG. Add `accessible`, `accessibilityRole="image"`, and `accessibilityLabel`:

```tsx
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('trends.a11y.chart', {
        count: data.points.length,
        avg: /* the average already computed for the axis, or points.length */ '',
        unit,
      })}
      style={/* existing container style */}
    >
```

If the chart component does not currently receive `t`/an average, pass a simple count-only label: `t('trends.a11y.chart', { count: data.points.length, avg: '—', unit })`. The goal is one spoken summary, not per-point navigation (gifted-charts SVG points are not individually focusable).

- [ ] **Step 3: Mark the privacy-policy row as a link**

In `app/(tabs)/settings/about.tsx`, the privacy-policy `TouchableOpacity`/row should carry `accessibilityRole="link"` and `accessibilityLabel={t('screens.settings.about.privacyPolicy')}`. Add both props to that pressable.

- [ ] **Step 4: Grep for any unlabeled raw pressables**

Run: `rg -n "TouchableOpacity|Pressable" app src/ui/components | rg -v "accessibilityRole"`
Expected: review each hit. Every interactive pressable must resolve to one with `accessibilityRole` + a label (directly or via a primitive). Add labels to any bare ones found. Decorative-only wrappers (no `onPress`) may be left.

- [ ] **Step 5: Type-check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: green (JSON parses, no type errors).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/vi.json src/i18n/en.json src/ui/components/blood-sugar-chart.tsx app/(tabs)/settings/about.tsx
git commit -m "feat: accessible chart summary and link labels"
```

---

## Task 7: Evergreen app icon + splash screen

Replace the default Expo template art with a simple, high-contrast Evergreen mark (a white drop/"sugar" glyph on the brand green), and point `app.json` at Evergreen colors.

**Files:**
- Create: `assets/images/icon.svg` (source art, checked in)
- Overwrite: `assets/images/icon.png`, `assets/images/splash-icon.png`, `assets/images/android-icon-foreground.png` (generated from the SVG)
- Modify: `app.json`

- [ ] **Step 1: Write the source SVG**

```svg
<!-- assets/images/icon.svg — 1024×1024 Evergreen app mark -->
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="#0FA36B"/>
  <!-- Blood-drop glyph, white, centered -->
  <path fill="#FFFFFF" d="M512 232c0 0 200 236 200 372a200 200 0 1 1-400 0c0-136 200-372 200-372z"/>
  <!-- Highlight -->
  <circle cx="440" cy="600" r="46" fill="#0FA36B" opacity="0.18"/>
</svg>
```

- [ ] **Step 2: Generate PNGs from the SVG**

Use whichever rasterizer is available. Preferred (no install, uses the `sharp` that ships with many Expo toolchains) — try in order:

```bash
# Option A: rsvg-convert (brew install librsvg)
rsvg-convert -w 1024 -h 1024 assets/images/icon.svg -o assets/images/icon.png
rsvg-convert -w 1024 -h 1024 assets/images/icon.svg -o assets/images/android-icon-foreground.png
rsvg-convert -w 512  -h 512  assets/images/icon.svg -o assets/images/splash-icon.png

# Option B: sharp-cli via npx (if rsvg not present)
npx --yes sharp-cli -i assets/images/icon.svg -o assets/images/icon.png resize 1024 1024
npx --yes sharp-cli -i assets/images/icon.svg -o assets/images/android-icon-foreground.png resize 1024 1024
npx --yes sharp-cli -i assets/images/icon.svg -o assets/images/splash-icon.png resize 512 512
```

Expected: three PNGs written. Confirm with `file assets/images/icon.png` → "PNG image data, 1024 x 1024".

If neither rasterizer is available in the environment, STOP and ask the user to run one of the commands locally (art generation needs a rasterizer); do not ship the blue template icon.

- [ ] **Step 3: Point `app.json` at Evergreen colors**

In `app.json`, update the splash plugin `backgroundColor` and the android adaptive `backgroundColor` from the template blues to Evergreen:

```json
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#0FA36B",
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 160
        }
      ],
```

And in `android.adaptiveIcon`, change `"backgroundColor": "#E6F4FE"` to `"backgroundColor": "#0FA36B"`. (Leave `web.favicon` as-is or regenerate a 48² PNG the same way if time allows.) Remove the stale `ios.icon` pointing at `./assets/expo.icon` if it still references template art — set `ios` to use the shared `icon.png` (delete the `"icon": "./assets/expo.icon"` line so iOS falls back to the top-level `icon`).

- [ ] **Step 4: Verify the splash + icon render**

Run: `npx expo start -c` (clear cache) and open the app.
Expected: green splash with the white drop mark; app icon on the home screen is the green mark (not the blue Expo template). On Android the adaptive icon sits on a green background.

- [ ] **Step 5: Commit**

```bash
git add assets/images/icon.svg assets/images/icon.png assets/images/splash-icon.png \
  assets/images/android-icon-foreground.png app.json
git commit -m "feat: evergreen app icon and splash screen"
```

---

## Task 8: Final verification + screen-reader walkthrough

**Files:** none (verification only).

- [ ] **Step 1: Full gate**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: type check clean, all tests pass, lint clean.

- [ ] **Step 2: VoiceOver (iOS) / TalkBack (Android) end-to-end**

Turn on the screen reader and complete the acceptance flow **log → history → export** entirely by swipe navigation + double-tap:
- [ ] Log tab: reach the value field ("Enter blood sugar value"), meal chips announce "{meal} meal, button, selected/…", timing toggle announces state, Save announces "Save reading, button". Complete a save; the success alert is announced.
- [ ] History tab: each row reads the full summary ("{value} {unit}, {context}, {date} {time}. Tap for details."); open detail; Edit/Delete reachable and labeled.
- [ ] Settings → Export: range chips announce selection; "Export CSV" reachable; share sheet opens.

Note any element the screen reader skips or mis-announces and fix before committing.

- [ ] **Step 3: Confirm the app boots and the polished screens are reachable**

Run: `npx expo start` → open Log, History, Trends, Settings. No crashes; contrast fixes visible (low readings now show a dark-amber value, not pale yellow); splash/icon are green.

- [ ] **Step 4: Final commit (if any walkthrough fixes were made)**

```bash
git add -A
git commit -m "feat: accessibility and ui polish"
```

(If every prior task was already committed and the walkthrough needed no fixes, the Session 9 work is already on `main`/branch — the per-task commits satisfy the DoD. Otherwise this final commit carries the walkthrough fixes.)

---

## Self-Review (against PLAN.md Session 9 + PRD story 52)

**Spec coverage:**
- "Audit every screen at 1.3× font scale — no clipped text" → Task 5 (caps) + Step 4 manual audit of all 8 screens.
- "accessibilityLabel/Role on all interactive elements" → primitives already covered (verified); Task 6 closes chart + privacy link + grep sweep.
- "contrast check on badges/chart colors" → Task 1 (utility) + Task 2 (status text/badge fixed & test-locked); chart colors reviewed in Task 6 Step 2 / Task 5 manual audit.
- "Haptic + visual feedback on save" → Task 3 (wrapper) + Task 4 (wired into save/out-of-range/error + delete-all). Visual = existing saved `Alert` retained.
- "loading/empty/error states everywhere" → already present (documented in Current State); no new work needed — noted so it isn't skipped silently.
- "App icon + splash (simple, high-contrast)" → Task 7.
- Accept "VoiceOver/TalkBack can complete log→history→export" → Task 8 Step 2.

**Placeholder scan:** the only manual/asset step is Task 7 rasterization (explicit fallback: ask user to run the command) and the Task 6 chart-average value (explicit fallback: count-only label). No "TBD"/"add error handling" placeholders.

**Type consistency:** `contrastRatio`/`relativeLuminance` (Task 1) reused by Task 2's test. `statusColor` keeps its signature; new `statusBadge` returns `{ color, backgroundColor }` matching `Badge`'s props exactly. `haptics.{success,warning,error,selection}` (Task 3) match the call sites in Task 4. New color tokens `inRangeText`/`lowText`/`highText` defined in Task 2 Step 3 before use.
