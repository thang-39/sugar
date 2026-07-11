# Session 12 — "Hôm nay" (Today tab for all modes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first "Hôm nay" tab that opens the app to today's logged readings — each rendered as a card labelled by the before/after-meal choice already saved on the reading — for both gestational and general modes, reusing the existing Log form to add new entries.

**Architecture:** The Today tab is a pure read view over today's readings (SQLite stays the source of truth). It queries readings recorded today, sorts them chronologically, and renders each as a `ReadingCard` whose title/icon/tint derive from the reading's own saved `mealType` + `mealTiming` + status. **No pending-slot scaffold and no `buildSlotDefs`** — those were dropped per the 2026-07-11 decision below. The Today screen becomes the tab's `index` route; the current Log form moves to a `log` route so the Session 11 deep-link contract keeps landing on the form. Mode branching lives only in the single Today header.

**Tech Stack:** Expo Router (file-based tabs), TypeScript strict, Jest, react-i18next, `useTheme()` runtime theming, existing UI primitives (`Card`, `AppText`, `Button`), existing `evaluateReading` for status tint.

---

## Decisions locked (read before coding)

1. **Readings-only, no pending slots (decided 2026-07-11).** `mealTiming`/`mealType`/`hoursAfterMeal` are already persisted columns (`schema.ts:9-11`). The Today tab shows exactly what's been logged today, each reading as its own card labelled by its saved before/after choice, sorted by `recordedAt` ascending. There are **no** "chưa đo / Ghi ngay" placeholder slots and **no** reminder-derived slot template in this session. (`buildSlotDefs` / `getDaySlots` are deferred — Session 13's report already uses `getDaySlots`; leave it untouched.)
2. **Tapping a reading card opens its detail** (`/history/[id]`) for view/edit — not a prefilled Log form (there's no pending slot to fill). Adding a *new* reading is the "Ghi chỉ số" button → the Log form.
3. **Today becomes the landing tab (`index`).** The current Log form (`app/(tabs)/index.tsx`) moves verbatim to `app/(tabs)/log.tsx`. The Session 11 **after-meal** deep-link push target changes `/(tabs)` → `/(tabs)/log`; the **manual** reminder tap keeps `/(tabs)` (now Today — the intended "open the app" behaviour).
4. **Report link is a placeholder** routing to the existing `/(tabs)/settings/export` screen until Session 13 replaces it.
5. **No `postpartum` variant** — that is Session 21. Session 12 handles exactly two headers: gestational (`conditionType === 'gestational'` && `dueDate != null` → week + countdown) and general (localized date).
6. **New components MUST use `useTheme()`** (CLAUDE.md), so `ReadingCard` and the Today screen re-theme under rose/evergreen. Do not import the static `colors`.

---

## File Structure

**Topic A — UI: reading display + card (presentational)**
- Create: `src/ui/utils/reading-display.ts` — `Reading` → `{ titleKey, icon, iconColor }`.
- Create: `src/ui/utils/__tests__/reading-display.test.ts`.
- Create: `src/ui/components/reading-card.tsx` — the `ReadingCard` composite on primitives.

**Topic B — Screen, routing & i18n**
- Create: `app/(tabs)/log.tsx` — the Log form (moved from `index.tsx`, byte-identical body).
- Rewrite: `app/(tabs)/index.tsx` — the Today screen.
- Modify: `app/(tabs)/_layout.tsx` — declare Today first, add `log` screen, `today` tab icon/title.
- Modify: `app/_layout.tsx` — after-meal deep-link push target → `/(tabs)/log`.
- Modify: `src/i18n/vi.json`, `src/i18n/en.json` — `tabs.today`, `today.*` strings.

---

# TOPIC A — UI: reading display + `ReadingCard`

### Task A1: Reading display helper (title key, icon, colour)

**Files:**
- Create: `src/ui/utils/reading-display.ts`
- Create: `src/ui/utils/__tests__/reading-display.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/ui/utils/__tests__/reading-display.test.ts`:

```ts
import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { readingDisplay } from '@/ui/utils/reading-display';

function reading(partial: Partial<Reading>): Reading {
  return {
    id: 'r1',
    value: 100,
    mealType: MealType.Breakfast,
    mealTiming: MealTiming.Before,
    recordedAt: 0,
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'pending',
    ...partial,
  };
}

describe('readingDisplay', () => {
  it('labels a Before+Breakfast reading as fasting with the bed icon', () => {
    const d = readingDisplay(reading({ mealTiming: MealTiming.Before, mealType: MealType.Breakfast }));
    expect(d.titleKey).toBe('today.slots.before.Breakfast');
    expect(d.icon).toBe('bed-outline');
  });

  it('labels an After reading with the after key and the meal icon', () => {
    const d = readingDisplay(reading({ mealTiming: MealTiming.After, mealType: MealType.Lunch }));
    expect(d.titleKey).toBe('today.slots.after.Lunch');
    expect(d.icon).toBe('restaurant-outline');
  });

  it('uses the before key for a non-breakfast Before reading (not fasting)', () => {
    const d = readingDisplay(reading({ mealTiming: MealTiming.Before, mealType: MealType.Dinner }));
    expect(d.titleKey).toBe('today.slots.before.Dinner');
    expect(d.icon).toBe('moon-outline');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reading-display`
Expected: FAIL with "Cannot find module '@/ui/utils/reading-display'".

- [ ] **Step 3: Write minimal implementation**

Create `src/ui/utils/reading-display.ts`:

```ts
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { MealTiming, MealType } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { mealColor } from '@/ui/theme';
import { mealIcon } from '@/ui/utils/meal-display';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ReadingDisplay {
  /** i18n key under `today.slots.*` for the card title. */
  titleKey: string;
  icon: IconName;
  /** Icon-tile background (per-meal accent). */
  iconColor: string;
}

/** Presentational metadata for a logged reading, derived from its saved meal semantics. */
export function readingDisplay(reading: Reading): ReadingDisplay {
  const isBefore = reading.mealTiming === MealTiming.Before;
  const isFasting = isBefore && reading.mealType === MealType.Breakfast;
  return {
    titleKey: isBefore
      ? `today.slots.before.${reading.mealType}`
      : `today.slots.after.${reading.mealType}`,
    icon: isFasting ? 'bed-outline' : mealIcon[reading.mealType],
    iconColor: mealColor[reading.mealType],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reading-display`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/utils/reading-display.ts src/ui/utils/__tests__/reading-display.test.ts
git commit -m "feat: reading display helper for the today tab"
```

---

### Task A2: `ReadingCard` component

**Files:**
- Create: `src/ui/components/reading-card.tsx`

- [ ] **Step 1: Write the component**

Create `src/ui/components/reading-card.tsx`:

```ts
import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import type { Language } from '@/domain/models/settings';
import type { Reading } from '@/domain/models/reading';
import { RangeEvaluation, type TargetRanges } from '@/domain/models/target-range';
import type { Unit } from '@/domain/models/unit';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { AppText } from '@/ui/components/ui';
import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { formatTime, formatValue } from '@/ui/utils/format';
import { readingDisplay } from '@/ui/utils/reading-display';

interface ReadingCardProps {
  reading: Reading;
  unit: Unit;
  language: Language;
  ranges: TargetRanges;
  onPress: () => void;
}

function statusColor(evaluation: RangeEvaluation, colors: ColorScheme): string {
  if (evaluation === RangeEvaluation.Low) return colors.lowText;
  if (evaluation === RangeEvaluation.High) return colors.highText;
  return colors.inRangeText;
}

/** One logged reading on the Today tab, labelled by its saved before/after choice. */
export function ReadingCard({ reading, unit, language, ranges, onPress }: ReadingCardProps): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const display = readingDisplay(reading);
  const valueColor = statusColor(evaluateReading(reading, ranges), colors);
  const title = t(display.titleKey);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${formatValue(reading.value, unit)}`}
    >
      <View style={[styles.iconTile, { backgroundColor: display.iconColor }]}>
        <Ionicons name={display.icon} size={22} color={colors.onDark} />
      </View>

      <View style={styles.body}>
        <AppText weight="bold">{title}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {formatTime(new Date(reading.recordedAt), language)}
        </AppText>
      </View>

      <AppText variant="heading" color={valueColor}>
        {formatValue(reading.value, unit)}
      </AppText>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    iconTile: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: spacing.xs },
  });
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. (i18n keys `today.*` are added in Task B4; `t()` accepts unknown keys at runtime, so tsc is green now.)

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/reading-card.tsx
git commit -m "feat: ReadingCard composite for the today tab"
```

---

# TOPIC B — Screen, routing & i18n

### Task B1: Move the Log form to its own route

**Files:**
- Create: `app/(tabs)/log.tsx`
- (`app/(tabs)/index.tsx` is rewritten in Task B3.)

- [ ] **Step 1: Create `app/(tabs)/log.tsx` with the current Log screen body**

Create `app/(tabs)/log.tsx` containing the exact current contents of `app/(tabs)/index.tsx` (default export `LogScreen`, unchanged):

```ts
import type { ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';

import { LogReadingForm } from '@/ui/components/log-reading-form';
import { parseLogPrefill } from '@/ui/utils/log-prefill';
import { ScreenHeader } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, spacing } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

export default function LogScreen(): ReactElement {
  const { t } = useTranslation();
  const preferredLanguage = useSettingsStore((s) => s.preferredLanguage);
  const params = useLocalSearchParams();
  const prefill = parseLogPrefill(params);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ScreenHeader
              title={t('screens.log.title')}
              subtitle={formatDate(new Date(), preferredLanguage)}
            />
          </View>
          <LogReadingForm prefill={prefill} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
```

- [ ] **Step 2: Commit (index still holds the old Log screen for now)**

```bash
git add app/(tabs)/log.tsx
git commit -m "feat: add log route (Log form moved to /log)"
```

---

### Task B2: Update the after-meal deep-link target

**Files:**
- Modify: `app/_layout.tsx:142-149`

- [ ] **Step 1: Point the prefill push at the Log route**

In `app/_layout.tsx`, change the after-meal branch `pathname` from `'/(tabs)'` to `'/(tabs)/log'`:

```ts
    router.push({
      pathname: '/(tabs)/log',
      params: toLogParams({
        mealType: payload.mealType,
        mealTiming: payload.mealTiming,
        hoursAfterMeal: payload.hoursAfterMeal,
      }),
    });
```

Leave the `manual` branch as `router.push('/(tabs)')` (it now opens the Today tab).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "fix: after-meal deep-link targets the log route"
```

---

### Task B3: The Today screen (`index.tsx`)

**Files:**
- Rewrite: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace `app/(tabs)/index.tsx` with the Today screen**

```ts
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ConditionType } from '@/domain/models/condition';
import type { TargetRanges } from '@/domain/models/target-range';
import { pregnancyWeek } from '@/domain/use-cases/pregnancy-week';
import { AppText, Button, Card } from '@/ui/components/ui';
import { ReadingCard } from '@/ui/components/reading-card';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

const DAY_MS = 86_400_000;

export default function TodayScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();

  const {
    conditionType,
    dueDate,
    preferredUnit,
    preferredLanguage,
    fastingRange,
    postMealRange,
    postMeal2hRange,
  } = useSettingsStore();

  // Local start-of-day so readings roll over at midnight in the device timezone.
  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const { readings } = useReadings({ from: dayStart, to: dayStart + DAY_MS - 1 });

  // useReadings returns newest-first; the Today list reads chronologically.
  const todaysReadings = useMemo(
    () => readings.slice().sort((a, b) => a.recordedAt - b.recordedAt),
    [readings],
  );

  const ranges: TargetRanges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );

  const isGestational = conditionType === ConditionType.Gestational && dueDate !== null;
  const week = isGestational && dueDate !== null ? pregnancyWeek(dueDate, Date.now()) : undefined;
  const daysUntilDue =
    dueDate !== null ? Math.max(0, Math.ceil((dueDate - Date.now()) / DAY_MS)) : undefined;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {isGestational ? (
          <>
            <AppText variant="title">{t('today.header.week', { week })}</AppText>
            <AppText color={colors.textMuted}>
              {t('today.header.dueCountdown', { days: daysUntilDue })}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="title">{t('today.header.today')}</AppText>
            <AppText color={colors.textMuted}>{formatDate(new Date(), preferredLanguage)}</AppText>
          </>
        )}

        {todaysReadings.length > 0 ? (
          <Card style={styles.listCard}>
            {todaysReadings.map((reading) => (
              <ReadingCard
                key={reading.id}
                reading={reading}
                unit={preferredUnit}
                language={preferredLanguage}
                ranges={ranges}
                onPress={() =>
                  router.push({ pathname: '/history/[id]', params: { id: reading.id } })
                }
              />
            ))}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="water-outline" size={48} color={colors.primary} />
            <AppText variant="heading" style={styles.emptyText}>
              {t('today.empty.title')}
            </AppText>
            <AppText color={colors.textMuted} style={styles.emptyText}>
              {t('today.empty.subtitle')}
            </AppText>
          </Card>
        )}

        <Button
          label={t('today.logReading')}
          icon="add"
          onPress={() => router.push('/(tabs)/log')}
          style={styles.logButton}
        />
        <Button
          label={t('today.addReminder')}
          icon="alarm-outline"
          variant="ghost"
          onPress={() => router.push('/(tabs)/settings/reminders?new=1')}
        />
        <Button
          label={t('today.exportReport')}
          variant="ghost"
          onPress={() => router.push('/(tabs)/settings/export')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1, gap: spacing.md },
  listCard: { gap: spacing.sm, padding: spacing.sm },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center' },
  logButton: { marginTop: spacing.sm },
});
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. (`today.*` keys are added next; runtime-only.)

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: today tab screen for all modes"
```

---

### Task B4: i18n strings

**Files:**
- Modify: `src/i18n/vi.json`, `src/i18n/en.json`

- [ ] **Step 1: Add the `tabs.today` key**

In `src/i18n/vi.json`, `"tabs"` object (currently lines 18-23), add `"today"` first:

```json
  "tabs": {
    "today": "Hôm nay",
    "log": "Ghi số",
    "history": "Lịch sử",
    "trends": "Biểu đồ",
    "settings": "Cài đặt"
  },
```

In `src/i18n/en.json`:

```json
  "tabs": {
    "today": "Today",
    "log": "Log",
    "history": "History",
    "trends": "Trends",
    "settings": "Settings"
  },
```

- [ ] **Step 2: Add the `today` namespace (vi)**

Add a top-level `"today"` object to `src/i18n/vi.json` (e.g. right after `"tabs"`):

```json
  "today": {
    "header": {
      "week": "Tuần {{week}}",
      "dueCountdown": "Còn {{days}} ngày đến ngày dự sinh",
      "today": "Hôm nay"
    },
    "slots": {
      "before": {
        "Breakfast": "Đói (trước ăn sáng)",
        "Lunch": "Trước ăn trưa",
        "Dinner": "Trước ăn tối",
        "Snack": "Trước ăn phụ"
      },
      "after": {
        "Breakfast": "Sau ăn sáng",
        "Lunch": "Sau ăn trưa",
        "Dinner": "Sau ăn tối",
        "Snack": "Sau ăn phụ"
      }
    },
    "empty": {
      "title": "Hôm nay chưa có chỉ số",
      "subtitle": "Ghi chỉ số đường huyết đầu tiên của ngày."
    },
    "logReading": "Ghi chỉ số",
    "addReminder": "Thêm nhắc đo",
    "exportReport": "Xuất báo cáo cho bác sĩ →"
  },
```

- [ ] **Step 3: Add the matching `today` namespace (en)**

Add to `src/i18n/en.json`:

```json
  "today": {
    "header": {
      "week": "Week {{week}}",
      "dueCountdown": "{{days}} days until your due date",
      "today": "Today"
    },
    "slots": {
      "before": {
        "Breakfast": "Fasting (before breakfast)",
        "Lunch": "Before lunch",
        "Dinner": "Before dinner",
        "Snack": "Before snack"
      },
      "after": {
        "Breakfast": "After breakfast",
        "Lunch": "After lunch",
        "Dinner": "After dinner",
        "Snack": "After snack"
      }
    },
    "empty": {
      "title": "No readings yet today",
      "subtitle": "Log your first blood sugar of the day."
    },
    "logReading": "Log a reading",
    "addReminder": "Add a reminder",
    "exportReport": "Export report for your doctor →"
  },
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "require('./src/i18n/vi.json'); require('./src/i18n/en.json'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/vi.json src/i18n/en.json
git commit -m "feat: today tab i18n strings (vi + en)"
```

---

### Task B5: Register the Today tab first + the Log tab

**Files:**
- Modify: `app/(tabs)/_layout.tsx:33-40` (the current `index` Log tab)

- [ ] **Step 1: Declare Today (index) first and add the Log screen**

In `app/(tabs)/_layout.tsx`, replace the current `<Tabs.Screen name="index" .../>` block (the Log tab) with a Today tab, then add a new `log` tab right after it:

```tsx
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: t('tabs.log'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
```

Leave the `history`, `trends`, and `settings` screens unchanged, in that order after these two.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: register today tab first, add log tab"
```

---

### Task B6: Full verification & manual smoke test

- [ ] **Step 1: Type check + tests + lint**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: all green.

- [ ] **Step 2: Manual smoke (Definition of Done #3)**

Run: `npx expo start`

Verify all of:
- App boots onto the **Hôm nay** tab (first tab).
- **General mode** (skip onboarding): date header + green theme; no readings today → empty-state card; "Ghi chỉ số" opens the Log form.
- Log a reading (any before/after choice) → return to Today → it appears as a card with the correct before/after label, its time, and the value tinted in/low/high.
- Log several readings → they list chronologically (earliest first).
- **GDM mode** (onboarding → gestational with a due date): week header + due countdown + rose theme; the same reading cards render under the rose palette.
- Tapping a reading card opens its detail screen (`/history/[id]`); edit there → return shows the updated value.
- "Thêm nhắc đo" opens the reminders screen with the new-reminder sheet; "Xuất báo cáo" opens the export screen.
- The Session 11 after-meal notification tap still lands on the **Log** form prefilled (deep-link intact).

- [ ] **Step 3: Final commit (if the smoke test required tweaks)**

```bash
git add -A
git commit -m "feat: today tab for all modes"
```

---

## Self-Review

- **Spec coverage (PLAN-2 Session 12), reconciled with the 2026-07-11 readings-only decision:**
  - New Today tab for both modes, Log untouched → B1/B3/B5 (Log moved verbatim, registered as its own tab). ✅
  - Header gestational (week + countdown) vs general (date) → B3 header branch. ✅
  - Today shows the day's readings, each labelled by its saved before/after choice, tinted by status → A1/A2 + B3. ✅
  - Add a new reading via the Log form; tap a card → its detail → A2 onPress + B3. ✅
  - Rose/evergreen theming → A2 + B3 use `useTheme()` only. ✅
  - Secondary "Xuất báo cáo" placeholder link → B3. ✅
  - Accept: readings roll over at midnight device tz (B3 filters via local start-of-day); helper unit-tested (A1); `tsc` + tests + lint green (B6). ✅
  - **Deliberately dropped vs PLAN-2 wording:** pending-slot scaffold + `buildSlotDefs` (reminder-derived empty "Ghi ngay" cells). Reason: user decision 2026-07-11 — the Today tab shows what's logged (from saved `mealTiming`), not a reminder-derived to-measure template. `getDaySlots` remains for Session 13's report.
- **Placeholder scan:** no "TBD"/"handle edge cases" — every code step is complete. ✅
- **Type consistency:** `readingDisplay` (A1) return shape matches its use in `ReadingCard` (A2); `ReadingCard` props match the call site in B3; `today.slots.before/after.{MealType}` keys (B4) cover all four `MealType` values used by `readingDisplay`. ✅

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-07-11-session-12-today-tab.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
