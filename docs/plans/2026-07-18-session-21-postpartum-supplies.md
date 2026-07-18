# Session 21 — Postpartum lifecycle + Supplies (affiliate) screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the due date, guide a gestational user through birth confirmation → postpartum OGTT screening reminders → optional graduation to long-term general tracking; and add a static "Vật tư đo đường huyết" affiliate screen with mandatory disclosure.

**Architecture:** Postpartum is **branch #4 of the mode-switch principle — NOT a new `ConditionType`.** It is `conditionType === 'gestational' && babyBornAt != null` (per PLAN-2 line 231). Three new nullable settings keys (`babyBornAt`, `postpartumPromptSnoozedAt`, `ogttDoneAt`) — JSON kv, no drizzle migration. Two pure, tested use-cases derive lifecycle phase and OGTT reminder dates; the data layer schedules them via fixed notification identifiers, rescheduled on every foreground (mirrors Session 20's weekly-summary). New UI reuses existing primitives so it auto-themes (Evergreen/Rose) with no guessed hex. Supplies is a config-driven static list opened via `Linking.openURL`.

**Tech Stack:** Expo Router, expo-notifications, `@react-native-community/datetimepicker` (already installed), zustand settings store, Jest + in-memory SQLite.

---

## Design status & reconciliation

The design file `design/Sugar App.dc.html` **already has** (postpartum branch, lines 207–233):
- The "Have you had your baby yet? 🎉" prompt with Yes / Not yet buttons.
- A basic OGTT card ("Re-check your blood sugar 4–12 weeks after birth").

**The design is missing / needs revision** (see the Claude Design prompt in the Appendix):
1. **Supplies screen** — does not exist at all.
2. **Postpartum setup screen/sheet** — the "Yes" flow (birth-date picker + congrats + "keep meal reminders?" toggle) is not drawn.
3. **OGTT card enhancement** — needs a countdown/weeks-since-birth line, an "Đã làm OGTT ✓" button, a done-state, and a "Tiếp tục theo dõi dài hạn" link.
4. **Header text** — postpartum header currently reads "Week 40" / "Due date … has passed"; per the Session 10 reconciliation checklist it should read "After delivery" / "Expected date … has passed".
5. **Settings row** for "Vật tư đo đường huyết".

**This plan does NOT block on the design export.** Every new screen/component is built from existing primitives (`Card`, `Button`, `AppText`, `SectionLabel`, `Notice`, `IconTile`, `Toggle`) that read colors from `useTheme()`, so they re-theme automatically and require no guessed token values (satisfies CLAUDE.md "never guess token values"). When the updated design lands, reconcile spacing/copy visually — no structural change expected.

## Decisions locked

- **Postpartum = phase, not `ConditionType`.** `resolveLifecyclePhase` derives `general | pregnant | postpartum`.
- **"Keep meal reminders?" default OFF** (most mothers stop measuring — PLAN-2 line 230). OFF disables `smartAfterMeal`, disables all `manualReminders`, and cancels their scheduled OS notifications (smart one-shots + re-checks included).
- **OGTT reminders:** one-shots at birth + 4 weeks and birth + 10 weeks (the 10w only fires if still unmarked, achieved by rescheduling on foreground). Once `ogttDoneAt` is set **or** 12 weeks pass, switch to a single **yearly** reminder whose next occurrence is recomputed on every app open (expo-notifications has no yearly trigger — PLAN-2 line 234). Fixed identifiers `ogtt:4w`, `ogtt:10w`, `ogtt:yearly`.
- **"Tiếp tục theo dõi dài hạn"** re-applies the **`general`** preset (theme → Evergreen; records untouched; postpartum branch vanishes because `conditionType` is no longer `gestational`). Reuses the existing `applyConditionPreset`.
- **Supplies links use `Linking.openURL`, not `expo-web-browser`** — **deviation from PLAN-2 line 237, deliberate.** Rationale: `Linking.openURL` hands off to the installed Shopee app (better affiliate attribution + conversion), matches the existing `openFeedback`/`openPrivacy` pattern, and adds no native dependency (`expo-web-browser` is not installed). Low risk; recorded here.

---

## File structure

**Create:**
- `src/domain/use-cases/lifecycle.ts` — `resolveLifecyclePhase`, `shouldShowBirthPrompt`, `LifecyclePhase`.
- `src/domain/use-cases/__tests__/lifecycle.test.ts`
- `src/domain/use-cases/ogtt-schedule.ts` — `computeOgttSchedule`, `OgttSchedule`, `OgttReminder`.
- `src/domain/use-cases/__tests__/ogtt-schedule.test.ts`
- `src/data/notifications/ogtt-reminders.ts` — `rescheduleOgttReminders` (reads settings, calls domain + notif service).
- `src/config/supplies.ts` — static affiliate list.
- `app/postpartum-setup.tsx` — birth-date + congrats + keep-reminders screen.
- `app/supplies.tsx` — supplies list screen.
- `src/ui/components/postpartum-card.tsx` — Today OGTT card.

**Modify:**
- `src/domain/models/settings.ts` — 3 new keys + defaults.
- `src/ui/hooks/use-settings.ts` — load the 3 keys.
- `src/data/repositories/__tests__/sqlite-settings-repository.test.ts` — round-trip test for the new keys.
- `src/data/notifications/notification-service.ts` — `'ogtt'` payload kind, `reconcileOgttReminders`, `cancelAllSmartReminders`.
- `app/_layout.tsx` — register `postpartum-setup` + `supplies`; reschedule OGTT on foreground; deep-link `ogtt` branch.
- `app/(tabs)/index.tsx` — birth prompt + postpartum header + PostpartumCard.
- `app/(tabs)/settings/index.tsx` — "Vật tư" row.
- `src/i18n/vi.json`, `src/i18n/en.json` — all new strings.

---

## Task 1: New settings keys (babyBornAt, postpartumPromptSnoozedAt, ogttDoneAt)

**Files:**
- Modify: `src/domain/models/settings.ts`
- Modify: `src/ui/hooks/use-settings.ts:35-89`
- Test: `src/data/repositories/__tests__/sqlite-settings-repository.test.ts`

- [ ] **Step 1: Add the interface fields.** In `src/domain/models/settings.ts`, after the `supportCode` field (line 46) inside `AppSettings`:

```ts
  // --- Session 21: postpartum lifecycle (JSON kv, no migration) ---
  /** Unix ms the baby was born. `null` = not yet born; `!= null` = postpartum phase. */
  babyBornAt: number | null;
  /** Unix ms the post-due-date "Mẹ sinh bé chưa?" prompt was last snoozed. `null` = never. */
  postpartumPromptSnoozedAt: number | null;
  /** Unix ms the postpartum OGTT re-check was marked done. `null` = not done. */
  ogttDoneAt: number | null;
```

- [ ] **Step 2: Add the defaults.** In the same file, after `supportCode: null,` (line 66) inside `DEFAULT_SETTINGS`:

```ts
  babyBornAt: null,
  postpartumPromptSnoozedAt: null,
  ogttDoneAt: null,
```

- [ ] **Step 3: Load the keys in the store.** In `src/ui/hooks/use-settings.ts`, add to the destructure array after `reviewAskedAt,` (line 51):

```ts
    babyBornAt,
    postpartumPromptSnoozedAt,
    ogttDoneAt,
```

Add to the `Promise.all` array after `getSettingsRepo().get('reviewAskedAt'),` (line 68):

```ts
    getSettingsRepo().get('babyBornAt'),
    getSettingsRepo().get('postpartumPromptSnoozedAt'),
    getSettingsRepo().get('ogttDoneAt'),
```

Add to the `set({...})` object after `reviewAskedAt,` (line 87):

```ts
    babyBornAt,
    postpartumPromptSnoozedAt,
    ogttDoneAt,
```

- [ ] **Step 4: Write the failing round-trip test.** In `src/data/repositories/__tests__/sqlite-settings-repository.test.ts`, add inside the top-level `describe`:

```ts
  it('round-trips postpartum keys, defaulting to null', async () => {
    const repo = new SqliteSettingsRepository(createTestDb());
    expect(await repo.get('babyBornAt')).toBeNull();
    expect(await repo.get('postpartumPromptSnoozedAt')).toBeNull();
    expect(await repo.get('ogttDoneAt')).toBeNull();

    await repo.set('babyBornAt', 1_700_000_000_000);
    await repo.set('ogttDoneAt', 1_700_500_000_000);
    expect(await repo.get('babyBornAt')).toBe(1_700_000_000_000);
    expect(await repo.get('ogttDoneAt')).toBe(1_700_500_000_000);
  });
```

> If `createTestDb`/`SqliteSettingsRepository` are imported differently at the top of the file, match the existing imports there (the `reportCount` test is the template).

- [ ] **Step 5: Run the test — expect PASS.**

Run: `npx jest sqlite-settings-repository -t "postpartum keys"`
Expected: PASS (the generic repo needs no change; defaults come from `DEFAULT_SETTINGS`).

- [ ] **Step 6: Type check.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit.**

```bash
git add src/domain/models/settings.ts src/ui/hooks/use-settings.ts src/data/repositories/__tests__/sqlite-settings-repository.test.ts
git commit -m "feat: add postpartum settings keys (babyBornAt, ogtt, snooze)"
```

---

## Task 2: Lifecycle phase + birth-prompt derivation (pure)

**Files:**
- Create: `src/domain/use-cases/lifecycle.ts`
- Test: `src/domain/use-cases/__tests__/lifecycle.test.ts`

- [ ] **Step 1: Write the failing test.** Create `src/domain/use-cases/__tests__/lifecycle.test.ts`:

```ts
import {
  resolveLifecyclePhase,
  shouldShowBirthPrompt,
} from '@/domain/use-cases/lifecycle';

const DAY = 86_400_000;

describe('resolveLifecyclePhase', () => {
  it('is general when not gestational', () => {
    expect(resolveLifecyclePhase({ conditionType: 'general', babyBornAt: null })).toBe('general');
  });
  it('is pregnant when gestational and not born', () => {
    expect(resolveLifecyclePhase({ conditionType: 'gestational', babyBornAt: null })).toBe(
      'pregnant',
    );
  });
  it('is postpartum once babyBornAt is set', () => {
    expect(resolveLifecyclePhase({ conditionType: 'gestational', babyBornAt: 1 })).toBe(
      'postpartum',
    );
  });
});

describe('shouldShowBirthPrompt', () => {
  const due = new Date(2026, 5, 1).getTime();
  const base = { conditionType: 'gestational' as const, babyBornAt: null, dueDate: due };

  it('shows when past due, not born, not snoozed', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: null, now: due + DAY })).toBe(true);
  });
  it('is hidden before the due date', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: null, now: due - DAY })).toBe(false);
  });
  it('is hidden while snoozed under 7 days', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: due, now: due + 3 * DAY })).toBe(false);
  });
  it('reappears once the 7-day snooze elapses', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: due, now: due + 8 * DAY })).toBe(true);
  });
  it('is hidden once the baby is born', () => {
    expect(
      shouldShowBirthPrompt({ ...base, babyBornAt: due, snoozedAt: null, now: due + DAY }),
    ).toBe(false);
  });
  it('is hidden for a general user', () => {
    expect(
      shouldShowBirthPrompt({
        conditionType: 'general',
        babyBornAt: null,
        dueDate: due,
        snoozedAt: null,
        now: due + DAY,
      }),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**

Run: `npx jest lifecycle`
Expected: FAIL — "Cannot find module '@/domain/use-cases/lifecycle'".

- [ ] **Step 3: Implement.** Create `src/domain/use-cases/lifecycle.ts`:

```ts
import { ConditionType } from '@/domain/models/condition';

/** The four mode branches, minus the theme concern (theme is derived from conditionType). */
export const LifecyclePhase = {
  General: 'general',
  Pregnant: 'pregnant',
  Postpartum: 'postpartum',
} as const;
export type LifecyclePhase = (typeof LifecyclePhase)[keyof typeof LifecyclePhase];

export interface LifecycleInput {
  conditionType: ConditionType;
  babyBornAt: number | null;
}

/** Postpartum is gestational + a recorded birth; NOT a separate ConditionType. */
export function resolveLifecyclePhase({
  conditionType,
  babyBornAt,
}: LifecycleInput): LifecyclePhase {
  if (conditionType !== ConditionType.Gestational) return LifecyclePhase.General;
  if (babyBornAt !== null) return LifecyclePhase.Postpartum;
  return LifecyclePhase.Pregnant;
}

const SNOOZE_MS = 7 * 86_400_000;

export interface BirthPromptInput {
  conditionType: ConditionType;
  babyBornAt: number | null;
  dueDate: number | null;
  snoozedAt: number | null;
  now: number;
}

/** Show the "Mẹ sinh bé chưa?" prompt: gestational, past due, unborn, not snoozed < 7d. */
export function shouldShowBirthPrompt({
  conditionType,
  babyBornAt,
  dueDate,
  snoozedAt,
  now,
}: BirthPromptInput): boolean {
  if (conditionType !== ConditionType.Gestational) return false;
  if (babyBornAt !== null) return false;
  if (dueDate === null || now < dueDate) return false;
  if (snoozedAt !== null && now - snoozedAt < SNOOZE_MS) return false;
  return true;
}
```

- [ ] **Step 4: Run the test — expect PASS.**

Run: `npx jest lifecycle`
Expected: PASS (9 assertions).

- [ ] **Step 5: Commit.**

```bash
git add src/domain/use-cases/lifecycle.ts src/domain/use-cases/__tests__/lifecycle.test.ts
git commit -m "feat: lifecycle phase and birth-prompt derivation"
```

---

## Task 3: OGTT schedule computation (pure)

**Files:**
- Create: `src/domain/use-cases/ogtt-schedule.ts`
- Test: `src/domain/use-cases/__tests__/ogtt-schedule.test.ts`

- [ ] **Step 1: Write the failing test.** Create `src/domain/use-cases/__tests__/ogtt-schedule.test.ts`:

```ts
import { computeOgttSchedule } from '@/domain/use-cases/ogtt-schedule';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

describe('computeOgttSchedule', () => {
  const born = new Date(2026, 0, 1).getTime();

  it('schedules the 4w and 10w reminders right after birth', () => {
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: null, now: born + DAY });
    expect(s.reminders.map((r) => r.id)).toEqual(['ogtt:4w', 'ogtt:10w']);
    expect(s.reminders[0]!.fireAt).toBe(born + 4 * WEEK);
    expect(s.reminders[1]!.fireAt).toBe(born + 10 * WEEK);
    expect(s.yearly).toBeNull();
  });

  it('drops the 4w reminder once it is in the past', () => {
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: null, now: born + 5 * WEEK });
    expect(s.reminders.map((r) => r.id)).toEqual(['ogtt:10w']);
    expect(s.yearly).toBeNull();
  });

  it('switches to a future yearly reminder once marked done', () => {
    const done = born + 6 * WEEK;
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: done, now: born + 7 * WEEK });
    expect(s.reminders).toEqual([]);
    expect(s.yearly).not.toBeNull();
    expect(s.yearly!.id).toBe('ogtt:yearly');
    expect(s.yearly!.fireAt).toBeGreaterThan(born + 7 * WEEK);
  });

  it('switches to yearly after 12 weeks even if never marked', () => {
    const s = computeOgttSchedule({ babyBornAt: born, ogttDoneAt: null, now: born + 13 * WEEK });
    expect(s.reminders).toEqual([]);
    expect(s.yearly).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails.**

Run: `npx jest ogtt-schedule`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement.** Create `src/domain/use-cases/ogtt-schedule.ts`:

```ts
const WEEK = 7 * 86_400_000;

export interface OgttReminder {
  /** Stable notification identifier: 'ogtt:4w' | 'ogtt:10w' | 'ogtt:yearly'. */
  id: string;
  /** Unix ms the reminder should fire. */
  fireAt: number;
}

export interface OgttSchedule {
  /** Future one-shots inside the 4–12 week screening window. */
  reminders: OgttReminder[];
  /** The single recurring reminder once screening is done/overdue (recomputed each app open). */
  yearly: OgttReminder | null;
}

export interface OgttScheduleInput {
  babyBornAt: number;
  ogttDoneAt: number | null;
  now: number;
}

/** Next same-calendar-day-of-year strictly after `now`, anchored on `anchor` (device tz). */
function nextAnnual(anchor: number, now: number): number {
  const d = new Date(anchor);
  while (d.getTime() <= now) {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.getTime();
}

/**
 * Postpartum OGTT reminders. Inside the 4–12 week window (unmarked) → one-shots at
 * birth+4w and birth+10w (only future ones survive). Once marked done OR past 12
 * weeks → a single yearly reminder anchored on the done date (or the 12-week mark).
 * Pure — call `rescheduleOgttReminders` on each foreground so the set stays current.
 */
export function computeOgttSchedule({
  babyBornAt,
  ogttDoneAt,
  now,
}: OgttScheduleInput): OgttSchedule {
  const fourW = babyBornAt + 4 * WEEK;
  const tenW = babyBornAt + 10 * WEEK;
  const twelveW = babyBornAt + 12 * WEEK;

  const inScreeningWindow = ogttDoneAt === null && now < twelveW;
  if (inScreeningWindow) {
    const reminders: OgttReminder[] = [];
    if (fourW > now) reminders.push({ id: 'ogtt:4w', fireAt: fourW });
    if (tenW > now) reminders.push({ id: 'ogtt:10w', fireAt: tenW });
    return { reminders, yearly: null };
  }

  const anchor = ogttDoneAt ?? twelveW;
  return { reminders: [], yearly: { id: 'ogtt:yearly', fireAt: nextAnnual(anchor, now) } };
}
```

- [ ] **Step 4: Run the test — expect PASS.**

Run: `npx jest ogtt-schedule`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/domain/use-cases/ogtt-schedule.ts src/domain/use-cases/__tests__/ogtt-schedule.test.ts
git commit -m "feat: postpartum OGTT reminder schedule computation"
```

---

## Task 4: Notification service — OGTT kind, reconcile, cancel-meal; foreground + deep-link wiring

**Files:**
- Modify: `src/data/notifications/notification-service.ts`
- Create: `src/data/notifications/ogtt-reminders.ts`
- Modify: `app/_layout.tsx:38-41` (imports), `:154-170` (deep-link), `:175-186` (foreground)
- Modify: `src/i18n/vi.json`, `src/i18n/en.json` (notif copy)

- [ ] **Step 1: Add the `'ogtt'` payload kind.** In `notification-service.ts`, change the `kind` union (line 21):

```ts
  kind: 'manual' | 'smart' | 'recheck' | 'weekly' | 'ogtt';
```

- [ ] **Step 2: Import the schedule type.** In `notification-service.ts`, extend the existing domain import block (lines 8-12) by adding this import below it:

```ts
import type { OgttSchedule } from '@/domain/use-cases/ogtt-schedule';
```

- [ ] **Step 3: Add `reconcileOgttReminders` and `cancelAllSmartReminders`.** In `notification-service.ts`, add before `getAllScheduled` (line 193):

```ts
/**
 * Reconcile OGTT reminders against a computed schedule. Cancels every `ogtt:*` id
 * then schedules the present ones. Idempotent — safe on every foreground.
 */
export async function reconcileOgttReminders(plan: OgttSchedule): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('ogtt:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const items = plan.yearly ? [...plan.reminders, plan.yearly] : plan.reminders;
  for (const item of items) {
    const isYearly = item.id === 'ogtt:yearly';
    await schedule(
      item.id,
      i18n.t(isYearly ? 'reminders.notif.ogttYearlyTitle' : 'reminders.notif.ogttTitle'),
      i18n.t(isYearly ? 'reminders.notif.ogttYearlyBody' : 'reminders.notif.ogttBody'),
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(item.fireAt) },
      { kind: 'ogtt' },
    );
  }
}

/**
 * Cancel every meal-anchored notification (smart after-meal + conditional re-check)
 * regardless of reading. Used when a mother stops measuring postpartum.
 */
export async function cancelAllSmartReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('smart:') || n.identifier.startsWith('recheck:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
```

- [ ] **Step 4: Add the OGTT notif copy.** In `src/i18n/vi.json`, under `reminders.notif` (add after `weeklyBody`):

```json
        "ogttTitle": "Đến hẹn kiểm tra đường huyết sau sinh 🌿",
        "ogttBody": "Bác sĩ thường hẹn kiểm tra lại trong 4–12 tuần sau sinh. Mẹ đặt lịch nhé.",
        "ogttYearlyTitle": "Nhắc kiểm tra đường huyết hằng năm 🌿",
        "ogttYearlyBody": "Đã một năm rồi — mẹ nhớ kiểm tra đường huyết định kỳ nhé."
```

In `src/i18n/en.json`, at the same path:

```json
        "ogttTitle": "Time for your postpartum blood-sugar check 🌿",
        "ogttBody": "Doctors usually re-check 4–12 weeks after birth. Book your test.",
        "ogttYearlyTitle": "Yearly blood-sugar check reminder 🌿",
        "ogttYearlyBody": "It's been a year — remember your routine blood-sugar check."
```

- [ ] **Step 5: Create the data-layer reschedule.** Create `src/data/notifications/ogtt-reminders.ts`:

```ts
import { ConditionType } from '@/domain/models/condition';
import { computeOgttSchedule } from '@/domain/use-cases/ogtt-schedule';
import { getSettingsRepository } from '@/data/repositories/factory';
import { reconcileOgttReminders } from './notification-service';

/**
 * Read postpartum settings and (re)schedule OGTT reminders. Cancels everything when
 * not in the postpartum phase. Mirror of `rescheduleWeeklySummary` — call on every
 * foreground so the 10-week and yearly reminders stay current without a background task.
 */
export async function rescheduleOgttReminders(now: number = Date.now()): Promise<void> {
  const repo = getSettingsRepository();
  const [conditionType, babyBornAt, ogttDoneAt] = await Promise.all([
    repo.get('conditionType'),
    repo.get('babyBornAt'),
    repo.get('ogttDoneAt'),
  ]);
  if (conditionType !== ConditionType.Gestational || babyBornAt === null) {
    await reconcileOgttReminders({ reminders: [], yearly: null });
    return;
  }
  await reconcileOgttReminders(computeOgttSchedule({ babyBornAt, ogttDoneAt, now }));
}
```

- [ ] **Step 6: Wire the foreground reschedule.** In `app/_layout.tsx`, add the import after line 38 (`rescheduleWeeklySummary` import):

```ts
import { rescheduleOgttReminders } from '@/data/notifications/ogtt-reminders';
```

Inside the retention-loop `run()` (line 177-180), add a line:

```ts
    const run = (): void => {
      void rescheduleWeeklySummary().catch(() => {});
      void rescheduleOgttReminders().catch(() => {});
      void maybeReviewFallback().catch(() => {});
    };
```

- [ ] **Step 7: Add the deep-link branch.** In `app/_layout.tsx`, in the routing effect after the `weekly` branch (line 161), add:

```ts
    if (payload.kind === 'ogtt') {
      router.push('/(tabs)');
      return;
    }
```

- [ ] **Step 8: Type check + tests.**

Run: `npx tsc --noEmit && npm test`
Expected: pass (no new tests here; existing suites unaffected).

- [ ] **Step 9: Commit.**

```bash
git add src/data/notifications/notification-service.ts src/data/notifications/ogtt-reminders.ts app/_layout.tsx src/i18n/vi.json src/i18n/en.json
git commit -m "feat: OGTT reminder scheduling and foreground reschedule"
```

---

## Task 5: Birth prompt + postpartum header on Today

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Modify: `src/i18n/vi.json`, `src/i18n/en.json` (`today.header.postpartum`, `today.header.dueDatePassed`, `today.birthPrompt.*`)

> The PostpartumCard body is Task 7; this task adds the header text + the pre-birth prompt and wires "Rồi ạ" → the setup screen (Task 6) and "Chưa" → snooze.

- [ ] **Step 1: Add i18n strings.** In `src/i18n/vi.json`, under `today.header` add:

```json
      "postpartum": "Sau sinh",
      "dueDatePassed": "Ngày dự sinh {{date}} đã qua"
```

Under `today` add a new `birthPrompt` block:

```json
    "birthPrompt": {
      "title": "Mẹ sinh bé chưa? 🎉",
      "yes": "Rồi ạ",
      "no": "Chưa"
    }
```

In `src/i18n/en.json`, same paths:

```json
      "postpartum": "After delivery",
      "dueDatePassed": "Expected date {{date}} has passed"
```
```json
    "birthPrompt": {
      "title": "Have you had your baby yet? 🎉",
      "yes": "Yes",
      "no": "Not yet"
    }
```

- [ ] **Step 2: Extend the store destructure + derive phase.** In `app/(tabs)/index.tsx`, replace the `useSettingsStore()` destructure (lines 25-33) with:

```ts
  const {
    conditionType,
    dueDate,
    babyBornAt,
    ogttDoneAt,
    postpartumPromptSnoozedAt,
    preferredUnit,
    preferredLanguage,
    fastingRange,
    postMealRange,
    postMeal2hRange,
    updateSetting,
  } = useSettingsStore();
```

Add these imports at the top (after line 10):

```ts
import { resolveLifecyclePhase, shouldShowBirthPrompt, LifecyclePhase } from '@/domain/use-cases/lifecycle';
import { PostpartumCard } from '@/ui/components/postpartum-card';
```

Replace the `isGestational`/`week` block (lines 54-59) with:

```ts
  const phase = resolveLifecyclePhase({ conditionType, babyBornAt });
  const isPregnant = phase === LifecyclePhase.Pregnant;
  const isPostpartum = phase === LifecyclePhase.Postpartum;
  const week = isPregnant && dueDate !== null ? pregnancyWeek(dueDate, Date.now()) : undefined;
  const daysUntilDue =
    dueDate !== null ? Math.max(0, Math.ceil((dueDate - Date.now()) / DAY_MS)) : undefined;
  const dueDateLabel =
    dueDate !== null ? formatDate(new Date(dueDate), preferredLanguage) : undefined;
  const showBirthPrompt = shouldShowBirthPrompt({
    conditionType,
    babyBornAt,
    dueDate,
    snoozedAt: postpartumPromptSnoozedAt,
    now: Date.now(),
  });
```

- [ ] **Step 3: Replace the header + body branching.** In `app/(tabs)/index.tsx`, replace the header ternary (lines 67-80) with a three-way header:

```ts
        {isPostpartum ? (
          <>
            <AppText variant="title">{t('today.header.postpartum')}</AppText>
            {dueDateLabel ? (
              <AppText variant="caption" color={colors.textMuted}>
                {t('today.header.dueDatePassed', { date: dueDateLabel })}
              </AppText>
            ) : null}
          </>
        ) : isPregnant ? (
          <>
            <AppText variant="title">{t('today.header.week', { week })}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('today.header.dueCountdown', { days: daysUntilDue })}
              {dueDateLabel ? ` · ${dueDateLabel}` : ''}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="title">{t('today.header.today')}</AppText>
            <AppText color={colors.textMuted}>{formatDate(new Date(), preferredLanguage)}</AppText>
          </>
        )}

        {showBirthPrompt ? (
          <Card style={styles.promptCard}>
            <AppText variant="heading" weight="extrabold">
              {t('today.birthPrompt.title')}
            </AppText>
            <View style={styles.promptRow}>
              <Button
                label={t('today.birthPrompt.yes')}
                onPress={() => router.push('/postpartum-setup')}
                style={styles.promptBtn}
              />
              <Button
                label={t('today.birthPrompt.no')}
                variant="ghost"
                onPress={() => void updateSetting('postpartumPromptSnoozedAt', Date.now())}
                style={styles.promptBtn}
              />
            </View>
          </Card>
        ) : null}

        {isPostpartum ? <PostpartumCard /> : null}
```

> Keep the existing readings list + action buttons (lines 82-125) below this. In postpartum the readings list still shows any logged readings (History/Trends unchanged); the PostpartumCard sits above it.

Add to `View` import — `View` is not currently imported in this file. Add `View` to the `react-native` import (line 3): `import { ScrollView, StyleSheet, View } from 'react-native';`

- [ ] **Step 4: Add the prompt styles.** In the `StyleSheet.create` at the bottom of `app/(tabs)/index.tsx`, add:

```ts
  promptCard: { gap: spacing.md },
  promptRow: { flexDirection: 'row', gap: spacing.sm },
  promptBtn: { flex: 1 },
```

- [ ] **Step 5: Type check.**

Run: `npx tsc --noEmit`
Expected: fails ONLY on the not-yet-created `PostpartumCard` import — that is created in Task 7. If you are running tasks in order, create a temporary stub first:

```ts
// src/ui/components/postpartum-card.tsx (temporary stub, replaced in Task 7)
import type { ReactElement } from 'react';
export function PostpartumCard(): ReactElement | null {
  return null;
}
```

Re-run `npx tsc --noEmit` — expected: no errors.

- [ ] **Step 6: Commit.**

```bash
git add app/(tabs)/index.tsx src/ui/components/postpartum-card.tsx src/i18n/vi.json src/i18n/en.json
git commit -m "feat: postpartum header and birth-confirm prompt on Today"
```

---

## Task 6: Postpartum setup screen (birth date + congrats + keep-reminders)

**Files:**
- Create: `app/postpartum-setup.tsx`
- Modify: `app/_layout.tsx` (register the screen in `RootStack`)
- Modify: `src/i18n/vi.json`, `src/i18n/en.json` (`screens.postpartumSetup.*`)

- [ ] **Step 1: Add i18n strings.** In `src/i18n/vi.json`, under `screens` add:

```json
    "postpartumSetup": {
      "title": "Chúc mừng mẹ",
      "congratsTitle": "Chúc mừng mẹ đã sinh bé! 🎉",
      "congratsSubtitle": "Sugar sẽ nhắc mẹ kiểm tra đường huyết lại sau sinh.",
      "dateLabel": "Ngày sinh bé",
      "keepRemindersLabel": "Tiếp tục nhắc đo theo bữa?",
      "keepRemindersHint": "Đa số mẹ ngừng đo sau sinh. Mẹ có thể bật lại bất cứ lúc nào.",
      "save": "Lưu"
    }
```

In `src/i18n/en.json`, same path:

```json
    "postpartumSetup": {
      "title": "Congratulations",
      "congratsTitle": "Congratulations on your baby! 🎉",
      "congratsSubtitle": "Sugar will remind you to re-check your blood sugar after birth.",
      "dateLabel": "Date of birth",
      "keepRemindersLabel": "Keep meal-time reminders?",
      "keepRemindersHint": "Most mothers stop measuring after birth. You can turn them back on any time.",
      "save": "Save"
    }
```

- [ ] **Step 2: Create the screen.** Create `app/postpartum-setup.tsx`:

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  cancelAllSmartReminders,
  reconcileManualReminders,
} from '@/data/notifications/notification-service';
import { rescheduleOgttReminders } from '@/data/notifications/ogtt-reminders';
import { AppText, Button, Card, IconTile, Notice, SectionLabel, Toggle } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

export default function PostpartumSetupScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { preferredLanguage, smartAfterMeal, manualReminders, updateSetting } = useSettingsStore();

  const [bornAt, setBornAt] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [keepReminders, setKeepReminders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const save = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await updateSetting('babyBornAt', bornAt.getTime());
      if (!keepReminders) {
        const disabled = manualReminders.map((r) => ({ ...r, enabled: false }));
        await updateSetting('manualReminders', disabled);
        await updateSetting('smartAfterMeal', { ...smartAfterMeal, enabled: false });
        await reconcileManualReminders(disabled);
        await cancelAllSmartReminders();
      }
      await rescheduleOgttReminders();
      router.replace('/(tabs)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <IconTile icon="happy" color={colors.primary} size={56} />
      <AppText variant="title">{t('screens.postpartumSetup.congratsTitle')}</AppText>
      <AppText color={colors.textMuted}>{t('screens.postpartumSetup.congratsSubtitle')}</AppText>

      <Card onPress={() => setShowPicker(true)} style={styles.dateCard}>
        <View style={styles.dateRow}>
          <IconTile icon="calendar" color={colors.primary} size={44} />
          <View style={styles.dateText}>
            <AppText variant="caption" color={colors.textMuted}>
              {t('screens.postpartumSetup.dateLabel')}
            </AppText>
            <AppText weight="black" variant="heading">
              {formatDate(bornAt, preferredLanguage)}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
        </View>
      </Card>

      {showPicker && (
        <DateTimePicker
          value={bornAt}
          mode="date"
          maximumDate={new Date()}
          onChange={(_event, selected) => {
            setShowPicker(Platform.OS === 'ios');
            if (selected) setBornAt(selected);
          }}
        />
      )}

      <SectionLabel style={styles.label}>{t('screens.postpartumSetup.keepRemindersLabel')}</SectionLabel>
      <Card style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <AppText style={styles.toggleText}>{t('screens.postpartumSetup.keepRemindersLabel')}</AppText>
          <Toggle
            value={keepReminders}
            onValueChange={setKeepReminders}
            accessibilityLabel={t('screens.postpartumSetup.keepRemindersLabel')}
          />
        </View>
      </Card>
      <Notice tone="info" message={t('screens.postpartumSetup.keepRemindersHint')} />

      <Button
        label={t('screens.postpartumSetup.save')}
        onPress={() => void save()}
        isLoading={isSaving}
        style={styles.save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  dateCard: { marginTop: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateText: { flex: 1 },
  label: { marginTop: spacing.md },
  toggleCard: {},
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  toggleText: { flex: 1 },
  save: { marginTop: spacing.lg },
});
```

> Verify `Button` supports `isLoading` (Settings' delete button uses it — line 277) and `Toggle` uses `onValueChange` (Settings line 183). Both confirmed in the current code.

- [ ] **Step 3: Register the screen.** In `app/_layout.tsx` `RootStack`, add after the `about` screen (line 258):

```tsx
      <Stack.Screen
        name="postpartum-setup"
        options={{ headerShown: true, title: t('screens.postpartumSetup.title') }}
      />
```

- [ ] **Step 4: Type check.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit.**

```bash
git add app/postpartum-setup.tsx app/_layout.tsx src/i18n/vi.json src/i18n/en.json
git commit -m "feat: postpartum setup screen (birth date, keep-reminders toggle)"
```

---

## Task 7: PostpartumCard on Today (OGTT countdown, mark done, long-term switch)

**Files:**
- Modify (replace the stub): `src/ui/components/postpartum-card.tsx`
- Modify: `src/i18n/vi.json`, `src/i18n/en.json` (`today.postpartum.*`)

- [ ] **Step 1: Add i18n strings.** In `src/i18n/vi.json`, under `today` add a `postpartum` block:

```json
    "postpartum": {
      "ogttTitle": "Kiểm tra đường huyết lại: tuần 4–12 sau sinh",
      "ogttSubtitle": "Sugar sẽ nhắc mẹ khi đến lúc.",
      "weeksSinceBirth": "Bé được {{weeks}} tuần",
      "markDone": "Đã làm OGTT ✓",
      "doneTitle": "Đã hoàn thành kiểm tra OGTT ✓",
      "doneSubtitle": "Sugar sẽ nhắc mẹ kiểm tra định kỳ hằng năm.",
      "continueLongTerm": "Tiếp tục theo dõi đường huyết dài hạn",
      "switchConfirmTitle": "Chuyển sang theo dõi thường ngày?",
      "switchConfirmMessage": "Giao diện và ngưỡng mặc định sẽ đổi sang chế độ thường ngày — dữ liệu đã ghi giữ nguyên.",
      "switchConfirm": "Chuyển"
    }
```

In `src/i18n/en.json`, same path:

```json
    "postpartum": {
      "ogttTitle": "Re-check your blood sugar: 4–12 weeks after birth",
      "ogttSubtitle": "Sugar will remind you when it's time.",
      "weeksSinceBirth": "{{weeks}} weeks since birth",
      "markDone": "Done OGTT ✓",
      "doneTitle": "OGTT re-check completed ✓",
      "doneSubtitle": "Sugar will remind you about your yearly check.",
      "continueLongTerm": "Keep tracking blood sugar long-term",
      "switchConfirmTitle": "Switch to daily tracking?",
      "switchConfirmMessage": "The theme and default ranges will change to daily-tracking mode — your logged data is untouched.",
      "switchConfirm": "Switch"
    }
```

- [ ] **Step 2: Replace the stub component.** Overwrite `src/ui/components/postpartum-card.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';

import { ConditionType } from '@/domain/models/condition';
import { rescheduleOgttReminders } from '@/data/notifications/ogtt-reminders';
import { AppText, Button, Card } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';

const WEEK_MS = 7 * 86_400_000;

/** Today card for the postpartum phase: OGTT screening → yearly check + graduate to general. */
export function PostpartumCard(): ReactElement | null {
  const { t } = useTranslation();
  const colors = useTheme();
  const { babyBornAt, ogttDoneAt, updateSetting, applyConditionPreset } = useSettingsStore();

  if (babyBornAt === null) return null;
  const isDone = ogttDoneAt !== null;
  const weeks = Math.max(0, Math.floor((Date.now() - babyBornAt) / WEEK_MS));

  const markDone = async (): Promise<void> => {
    await updateSetting('ogttDoneAt', Date.now());
    await rescheduleOgttReminders();
  };

  const continueLongTerm = (): void => {
    Alert.alert(
      t('today.postpartum.switchConfirmTitle'),
      t('today.postpartum.switchConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('today.postpartum.switchConfirm'),
          onPress: () => {
            void applyConditionPreset(ConditionType.General).then(() => rescheduleOgttReminders());
          },
        },
      ],
    );
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'calendar-outline'}
            size={26}
            color={colors.primary}
          />
          <AppText variant="heading" weight="extrabold" style={styles.title}>
            {isDone ? t('today.postpartum.doneTitle') : t('today.postpartum.ogttTitle')}
          </AppText>
        </View>
        <AppText color={colors.textMuted}>
          {isDone ? t('today.postpartum.doneSubtitle') : t('today.postpartum.ogttSubtitle')}
        </AppText>
        {!isDone && (
          <>
            <AppText variant="caption" color={colors.textMuted}>
              {t('today.postpartum.weeksSinceBirth', { weeks })}
            </AppText>
            <Button
              label={t('today.postpartum.markDone')}
              onPress={() => void markDone()}
              style={styles.doneBtn}
            />
          </>
        )}
      </Card>
      <Button
        label={t('today.postpartum.continueLongTerm')}
        variant="ghost"
        onPress={continueLongTerm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  doneBtn: { marginTop: spacing.sm },
});
```

> `common.cancel` already exists (used across Settings). `applyConditionPreset` and `updateSetting` come from the same store.

- [ ] **Step 3: Type check + tests.**

Run: `npx tsc --noEmit && npm test`
Expected: pass.

- [ ] **Step 4: Commit.**

```bash
git add src/ui/components/postpartum-card.tsx src/i18n/vi.json src/i18n/en.json
git commit -m "feat: postpartum OGTT card with done + long-term switch"
```

---

## Task 8: Supplies config + screen + Settings row + Today link

**Files:**
- Create: `src/config/supplies.ts`
- Create: `app/supplies.tsx`
- Modify: `app/_layout.tsx` (register), `app/(tabs)/settings/index.tsx` (row)
- Modify: `src/i18n/vi.json`, `src/i18n/en.json` (`screens.settings.supplies.*`, `screens.settings.index.rows.supplies`)

- [ ] **Step 1: Create the config.** Create `src/config/supplies.ts`:

```ts
import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Static list for the "Vật tư đo đường huyết" screen. Name + description are i18n
 * (keyed by `key` under `screens.settings.supplies.items`); the affiliate URL is
 * config data here (like FEEDBACK_FORM_URL). Placeholders until real Shopee
 * affiliate links exist — swap the URLs; updatable later via EAS Update (JS-only).
 */
export interface SupplyItem {
  key: string;
  icon: IconName;
  url: string;
}

export const SUPPLIES: readonly SupplyItem[] = [
  { key: 'strips', icon: 'documents-outline', url: 'https://shopee.vn/placeholder-strips' },
  { key: 'lancets', icon: 'medical-outline', url: 'https://shopee.vn/placeholder-lancets' },
  { key: 'meter', icon: 'pulse-outline', url: 'https://shopee.vn/placeholder-meter' },
];
```

- [ ] **Step 2: Add i18n strings.** In `src/i18n/vi.json`, under `screens.settings` add:

```json
    "supplies": {
      "title": "Vật tư đo đường huyết",
      "disclosure": "Một số liên kết là link tiếp thị — Sugar nhận hoa hồng nhỏ, giá của mẹ không đổi.",
      "items": {
        "strips": { "name": "Que thử đường huyết", "desc": "Accu-Chek, On Call Plus, Sinocare…" },
        "lancets": { "name": "Kim chích máu", "desc": "Đầu kim vô trùng dùng một lần." },
        "meter": { "name": "Máy đo đường huyết", "desc": "Máy đo cầm tay tại nhà." }
      }
    }
```

Add the settings row label under `screens.settings.index.rows`:

```json
      "supplies": "Vật tư đo đường huyết"
```

In `src/i18n/en.json`, same paths:

```json
    "supplies": {
      "title": "Blood-sugar supplies",
      "disclosure": "Some links are affiliate links — Sugar earns a small commission at no extra cost to you.",
      "items": {
        "strips": { "name": "Test strips", "desc": "Accu-Chek, On Call Plus, Sinocare…" },
        "lancets": { "name": "Lancets", "desc": "Single-use sterile needles." },
        "meter": { "name": "Glucose meter", "desc": "Handheld home meter." }
      }
    }
```
```json
      "supplies": "Blood-sugar supplies"
```

- [ ] **Step 3: Create the screen.** Create `app/supplies.tsx`:

```tsx
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SUPPLIES } from '@/config/supplies';
import { AppText, Card, IconTile, Notice } from '@/ui/components/ui';
import { spacing, useTheme } from '@/ui/theme';

export default function SuppliesScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();

  const open = async (url: string): Promise<void> => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.errorTitle'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Notice tone="info" message={t('screens.settings.supplies.disclosure')} />
      {SUPPLIES.map((item) => (
        <Card
          key={item.key}
          onPress={() => void open(item.url)}
          accessibilityRole="link"
          accessibilityLabel={t(`screens.settings.supplies.items.${item.key}.name`)}
        >
          <View style={styles.row}>
            <IconTile icon={item.icon} color={colors.primary} size={44} />
            <View style={styles.text}>
              <AppText weight="extrabold">
                {t(`screens.settings.supplies.items.${item.key}.name`)}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={styles.desc}>
                {t(`screens.settings.supplies.items.${item.key}.desc`)}
              </AppText>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textFaint} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  desc: { marginTop: 2, lineHeight: 18 },
});
```

> `common.errorTitle` is already used in Settings (line 55).

- [ ] **Step 4: Register the screen.** In `app/_layout.tsx` `RootStack`, add after the `postpartum-setup` screen (from Task 6):

```tsx
      <Stack.Screen
        name="supplies"
        options={{ headerShown: true, title: t('screens.settings.supplies.title') }}
      />
```

- [ ] **Step 5: Add the Settings row.** In `app/(tabs)/settings/index.tsx`, inside the "data" group `<Card>` (lines 232-270), add before the feedback row (line 257):

```tsx
        <SettingRow
          icon="cart"
          iconColor={colors.accentAmber}
          label={t('screens.settings.index.rows.supplies')}
          onPress={() => router.push('/supplies')}
        />
```

- [ ] **Step 6: Type check + lint.**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit.**

```bash
git add src/config/supplies.ts app/supplies.tsx app/_layout.tsx app/(tabs)/settings/index.tsx src/i18n/vi.json src/i18n/en.json
git commit -m "feat: supplies affiliate screen with disclosure"
```

---

## Task 9: Full verification (Definition of Done)

- [ ] **Step 1: Type check, tests, lint.**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: all green. New unit tests: `lifecycle` (9), `ogtt-schedule` (4), settings round-trip (1).

- [ ] **Step 2: Manual smoke (per PLAN-2 accept criteria).** `npx expo start`, then:
  - Set a gestational profile with a `dueDate` in the past (Settings → Tracking mode → gestational; then set an old due date via onboarding or DB). → Today shows the "Mẹ sinh bé chưa?" prompt. Tap **Chưa** → prompt disappears (snoozed).
  - Tap **Rồi ạ** → setup screen; pick a birth date; leave "keep reminders" OFF; **Lưu** → returns to Today in postpartum (header "Sau sinh"), PostpartumCard visible; smart/manual reminders cancelled.
  - DEV: assert exactly one `ogtt:4w` + `ogtt:10w` scheduled via `getAllScheduled()` (existing dev panel); after tapping **Đã làm OGTT ✓**, the two are gone and one `ogtt:yearly` remains at the next anniversary.
  - Tap **Tiếp tục theo dõi đường huyết dài hạn** → confirm → theme returns to Evergreen, postpartum card gone, no new drizzle migration; all OGTT reminders cancelled.
  - Settings → **Vật tư đo đường huyết** → disclosure visible at top; tapping an item opens the external link.
  - Toggle mode general ↔ gestational → UI re-themes Evergreen ↔ Rose (nothing regressed).

- [ ] **Step 3: Confirm no new drizzle migration was generated** (settings are JSON kv). `git status` shows no new files under `drizzle/`.

- [ ] **Step 4: Final session commit** (if any residual changes):

```bash
git add -A
git commit -m "feat: postpartum lifecycle and supplies screen"
```

---

## Self-review notes (author checklist, completed)

- **Spec coverage vs PLAN-2 Session 21:** trigger + prompt + 7-day snooze (Task 5) ✓; "Rồi ạ" flow with default-OFF reminders + cancellation (Task 6) ✓; postpartum branch #4 via phase not ConditionType (Tasks 2,5,7) ✓; OGTT 4w/10w + yearly reschedule-on-open (Tasks 3,4,7) ✓; long-term switch to `general` preset, records untouched (Task 7) ✓; Supplies screen + Settings row + disclosure + external links (Task 8) ✓; all strings i18n vi+en (every UI task) ✓. Today "small link under organizer" to supplies is covered by the Settings row + is optional per PLAN-2; not added to Today to avoid clutter — note if the design wants it.
- **Type consistency:** `LifecyclePhase`, `OgttSchedule`/`OgttReminder`, `SupplyItem` reused verbatim across tasks; `reconcileOgttReminders(plan)` param renamed to avoid clashing with the private `schedule()`.
- **No placeholders:** every step has concrete code; affiliate URLs and the Google-Form-style URL are intentional runtime placeholders (documented), not plan gaps.
- **Deviation flagged:** `Linking.openURL` instead of `expo-web-browser` (rationale above).

---

## Appendix — Claude Design prompt (English)

Paste into Claude Design with `design/Sugar App.dc.html` loaded; export the updated HTML back over that file so it can be diffed into `src/ui/theme` + primitives.

```
CONTEXT
This is "Sugar", an existing mobile app for Vietnamese pregnant women (gestational
diabetes) and general users tracking blood sugar. It already has a full design in
this file. Keep the existing design system EXACTLY: same layout, spacing, radius,
typography, cards (white rounded 20px, soft shadow 0 3px 12px rgba(27,43,36,.05)),
pill buttons, Nunito bold weights, Material Symbols Rounded icons. The app is
theme-per-mode: general = Evergreen (green, --brand #0FA36B, --surface #E9F5EF) and
gestational = Rose (pink). Use the existing --brand / --surface / --border / var()
tokens so every new element re-themes automatically. All copy is Vietnamese (the app
ships vi + en). Elderly-friendly: large text (≥14.5px in rows), high contrast,
minimal steps.

I need you to ADD 3 things and FIX 1 existing screen. Do NOT redesign anything else.

------------------------------------------------------------
1) FIX — Postpartum Today header + OGTT card
The existing postpartum branch on the Today tab shows the header "Week 40" / "Due
date {date} has passed". Change the title to "Sau sinh" (After delivery) and the
subtitle to "Ngày dự sinh {date} đã qua" (Expected date {date} has passed) — it is
NOT a due date anymore.
Then split that branch into TWO visual states driven by whether the birth is
confirmed:
  (a) NOT yet confirmed born: keep the "Mẹ sinh bé chưa? 🎉" card with [Rồi ạ]
      [Chưa] buttons (Rồi ạ = filled --brand pill, Chưa = ghost).
  (b) Confirmed born (postpartum): REPLACE the current static OGTT card with a
      richer one:
        - icon (event_available / check_circle when done),
        - title "Kiểm tra đường huyết lại: tuần 4–12 sau sinh",
        - a small muted line "Bé được {weeks} tuần",
        - a filled --brand pill button "Đã làm OGTT ✓",
        - when marked done: swap to a success state — title "Đã hoàn thành kiểm tra
          OGTT ✓" + subtitle "Sugar sẽ nhắc mẹ kiểm tra định kỳ hằng năm.", no button.
      Below the card, a ghost/text link "Tiếp tục theo dõi đường huyết dài hạn".

------------------------------------------------------------
2) NEW SCREEN — "Chúc mừng mẹ" (postpartum setup)
A pushable detail screen (same header + back-arrow pattern as Reminders/Report),
reached after tapping "Rồi ạ". Top to bottom, one calm column, generous vertical gap:
  - A friendly icon (e.g. sentiment_satisfied / celebration) in a --surface tile.
  - Title "Chúc mừng mẹ đã sinh bé! 🎉" + subtitle "Sugar sẽ nhắc mẹ kiểm tra đường
    huyết lại sau sinh."
  - A white card acting as a date field: label "Ngày sinh bé" + a big bold date value
    + chevron (opens a date picker; the date cannot be in the future).
  - A section label "Tiếp tục nhắc đo theo bữa?" and a white card with that label + a
    toggle on the right (default OFF).
  - A muted helper line under it: "Đa số mẹ ngừng đo sau sinh. Mẹ có thể bật lại bất
    cứ lúc nào." (calm, not a warning).
  - A full-width dark pill button "Lưu" at the bottom.

------------------------------------------------------------
3) NEW SCREEN — "Vật tư đo đường huyết" (supplies / affiliate)
A pushable detail screen (same header + back-arrow pattern). Top to bottom:
  - AT THE VERY TOP, a soft info banner (info tone, --surface tint, NOT a red
    warning) with the mandatory disclosure: "Một số liên kết là link tiếp thị —
    Sugar nhận hoa hồng nhỏ, giá của mẹ không đổi."
  - A vertical list of 3 tappable white cards, each: a left icon tile (--surface bg,
    --brand icon), a bold product name + a one-line muted description, and a small
    "open_in_new" icon on the right. Example items:
      • "Que thử đường huyết" — "Accu-Chek, On Call Plus, Sinocare…"
      • "Kim chích máu" — "Đầu kim vô trùng dùng một lần."
      • "Máy đo đường huyết" — "Máy đo cầm tay tại nhà."
  Tapping a card opens an external link (visually just a normal tappable card).

------------------------------------------------------------
4) NEW — "Vật tư đo đường huyết" row in the Settings list
Add a settings row "Vật tư đo đường huyết" (icon shopping_cart / storefront, amber
accent) with a chevron, in the same "data" group as Report/Backup/About. Same row
style as the existing Settings rows (icon + bold label + chevron, 15px 18px padding,
hairline divider).

------------------------------------------------------------
STYLE REMINDERS
- Reuse existing tokens/vars (--brand, --surface, --border, primary), don't hardcode
  new greens/pinks. The postpartum screens render in the Rose theme.
- Icons: Material Symbols Rounded (msr), matching current sizes (22px in rows, 20px
  chevrons, 44px icon tiles).
- Every new text string in Vietnamese, elderly-friendly sizes.
- After you're done, export the updated HTML so it can be diffed back into the app.
```
