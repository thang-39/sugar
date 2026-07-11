# Session 11 — Reminders (manual list + smart after-meal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship local scheduled reminders — a user-managed manual reminder list plus a smart after-meal reminder anchored on saved before-meal readings (with a conditional 2h re-check under the `1h+2h` protocol) — the #1 reason the app gets opened.

**Architecture:** *Preset over configuration, no code fork.* Reminders are plain settings keys (`manualReminders`, `smartAfterMeal`) with **no drizzle migration** (JSON kv). The **schedule computation is pure domain** (`src/domain/use-cases/reminder-schedule.ts`, fully unit-tested): it turns reminders + readings into neutral trigger descriptors. A thin **data-layer service** (`src/data/notifications/notification-service.ts`) translates those descriptors into `expo-notifications` calls, attaches i18n content, owns the identifier scheme, and is idempotent (change → cancel that id → reschedule). UI reads/writes settings; scheduling is a side effect at the UI/data boundary. Notification taps deep-link into the **existing** Log form via router params — a params contract Session 12's Today tab reuses.

**Tech Stack:** Expo SDK 54, `expo-notifications` (local only — does NOT un-defer server push), expo-router, Zustand settings store, Jest + RNTL. Bottom sheet via RN `Modal` (no new dep).

**Key decisions locked (PLAN-2.md §Session 11, reconciliation checklist):**
- Manual reminders: `{ id, label, time, enabled, repeat, date }`. Tapping a row opens the edit sheet (not just toggle). Delete lives *inside* the sheet (no inline X).
- Edit sheet fields: **Reminder name** + **Time** (prominent) + **Repeat** (`Every day` / `One time only`); one-time shows a context-aware date label (`Specific date` / `Special pregnancy date` / `Postpartum date`).
- Smart after-meal: master toggle + offset segmented `1h / 2h / 1h & 2h`; default offset derived from `afterMealProtocol`. Anchored on **saved before-meal readings**, not fixed meal times.
- Protocol `1h+2h` conditional re-check: an `After` reading with `hoursAfterMeal=1` that is **out of range** schedules one re-check at `recordedAt + 1h`; in-range schedules nothing.
- GDM preset seeds one "Đo lúc đói" manual reminder at `06:30` (editable/deletable); General seeds none.
- Reminders screen is available for **all modes** (shown in Settings for every user).
- Notification tap → deep link to Log form prefilled (`mealType`, `mealTiming='After'`, `hoursAfterMeal`, `recordedAt=now`).
- GDM onboarding ends with one-tap "Bật nhắc đo?" suggestion (skippable). Everything default-off for General.
- Copy caring, not clinical: "Đến giờ đo sau ăn trưa rồi mẹ ơi 🌿". All strings i18n (vi + en).

---

## File Structure

**Create:**
- `src/domain/models/reminder.ts` — `ManualReminder`, `SmartAfterMeal`, `SmartOffset`, `RepeatKind` types + `smartOffsetForProtocol` mapper.
- `src/domain/use-cases/reminder-schedule.ts` — pure trigger computation (the tested core).
- `src/domain/use-cases/__tests__/reminder-schedule.test.ts` — unit tests.
- `src/data/notifications/notification-service.ts` — `expo-notifications` wrapper (permission, schedule, cancel, reconcile, deep-link data), identifier scheme.
- `src/ui/components/ui/bottom-sheet.tsx` — `Modal`-based bottom sheet primitive.
- `src/ui/components/reminder-editor-sheet.tsx` — the reminder editor sheet composite.
- `app/(tabs)/settings/reminders.tsx` — reminders screen (manual list + smart section + dev debug).
- `src/ui/utils/log-prefill.ts` — the Log deep-link params contract (parse/serialize), reused by Session 12.

**Modify:**
- `src/domain/models/settings.ts` — add `manualReminders`, `smartAfterMeal` keys + defaults.
- `src/ui/hooks/use-settings.ts` — initialize + persist the two new keys.
- `src/ui/components/ui/index.ts` — export `BottomSheet`.
- `app/(tabs)/settings/index.tsx` — add "Nhắc đo đường huyết" row.
- `app/(tabs)/settings/_layout.tsx` — register the `reminders` screen title.
- `app/(tabs)/index.tsx` — read deep-link params → pass prefill to `LogReadingForm`.
- `src/ui/components/log-reading-form.tsx` — accept a `prefill` prop; fire smart scheduling after a successful **create**.
- `app/(tabs)/history/[id]/index.tsx` — cancel a reading's smart notifications on delete.
- `app/_layout.tsx` — set the notification handler + response listener (deep link, incl. cold start).
- `app/onboarding.tsx` — GDM: seed the fasting reminder + smart default, then a "Bật nhắc đo?" step.
- `src/i18n/vi.json`, `src/i18n/en.json` — all new strings.
- `app.json` — `expo-notifications` plugin + Android channel (Task 1).

---

## Task 1: Install expo-notifications + config + jest mock

**Files:**
- Modify: `app.json`
- Modify: `package.json` (via installer)
- Create: `__mocks__/expo-notifications.js`
- Modify: `jest.config.js`

- [ ] **Step 1: Install the SDK-matched version**

Run: `npx expo install expo-notifications`
Expected: adds `"expo-notifications": "~0.32.x"` (SDK 54 pin) to `package.json` dependencies. Do NOT hand-pick a version — `expo install` resolves the compatible one.

- [ ] **Step 2: Register the plugin + Android channel in `app.json`**

In `app.json`, inside the `expo.plugins` array, add the notifications plugin entry (keep existing plugins). If `expo.plugins` does not exist, create it:

```json
"plugins": [
  "expo-router",
  [
    "expo-notifications",
    {
      "color": "#0FA36B"
    }
  ]
]
```

(Match the existing plugin list — only append the `expo-notifications` entry. `color` is the Android notification accent; `#0FA36B` is the Evergreen brand.)

- [ ] **Step 3: Add a jest mock so the test env never touches native**

The pure domain tests never import `expo-notifications`, but the settings store and screens transitively might once wired. Create `__mocks__/expo-notifications.js` at repo root:

```js
// Minimal jest mock — Session 11 tests exercise the PURE schedule computation,
// not the native module. This keeps any transitive import from crashing the
// node test env.
const SchedulableTriggerInputTypes = { DAILY: 'daily', DATE: 'date' };
module.exports = {
  SchedulableTriggerInputTypes,
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => 'mock-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
};
```

- [ ] **Step 4: Point jest at the manual mock**

In `jest.config.js`, add a `moduleNameMapper` entry (BEFORE the general `@/` mappers is not required — module names are exact here):

```js
moduleNameMapper: {
  '^@/assets/(.*)$': '<rootDir>/assets/$1',
  '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.js',
  '^@/(.*)$': '<rootDir>/src/$1',
},
```

- [ ] **Step 5: Verify install is clean**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors; nothing imports the module yet).

- [ ] **Step 6: Commit**

```bash
git add app.json package.json package-lock.json __mocks__/expo-notifications.js jest.config.js
git commit -m "chore: add expo-notifications and jest mock"
```

---

## Task 2: Reminder domain models + settings keys

**Files:**
- Create: `src/domain/models/reminder.ts`
- Modify: `src/domain/models/settings.ts`

- [ ] **Step 1: Create the reminder model**

Create `src/domain/models/reminder.ts`:

```ts
import type { AfterMealProtocol } from './condition';

/** Reminder repeat behavior. */
export const RepeatKind = {
  Daily: 'daily',
  Once: 'once',
} as const;
export type RepeatKind = (typeof RepeatKind)[keyof typeof RepeatKind];

/**
 * A user-managed measurement reminder. `time` is a local wall-clock "HH:mm"
 * (24h). For `repeat: 'once'`, `date` is a local calendar day "YYYY-MM-DD"
 * (undefined for daily).
 */
export interface ManualReminder {
  id: string;
  label: string;
  time: string; // "HH:mm", 24h local
  enabled: boolean;
  repeat: RepeatKind;
  date?: string; // "YYYY-MM-DD", only for repeat === 'once'
}

/** Smart after-meal offset. `both` = fire at 1h AND 2h. */
export const SmartOffset = {
  OneHour: '1h',
  TwoHours: '2h',
  Both: 'both',
} as const;
export type SmartOffset = (typeof SmartOffset)[keyof typeof SmartOffset];

export interface SmartAfterMeal {
  enabled: boolean;
  offset: SmartOffset;
}

/** The smart-reminder default offset implied by the doctor's after-meal protocol. */
export function smartOffsetForProtocol(protocol: AfterMealProtocol): SmartOffset {
  switch (protocol) {
    case '2h':
      return SmartOffset.TwoHours;
    case '1h+2h':
      return SmartOffset.Both;
    default:
      return SmartOffset.OneHour;
  }
}
```

- [ ] **Step 2: Add the settings keys**

In `src/domain/models/settings.ts`, add imports and fields. Add to the imports at top:

```ts
import type { ManualReminder, SmartAfterMeal } from './reminder';
```

Add to the `AppSettings` interface (after `postMeal2hRange`):

```ts
  // --- Session 11: reminders (JSON kv, no migration) ---
  manualReminders: ManualReminder[];
  smartAfterMeal: SmartAfterMeal;
```

Add to `DEFAULT_SETTINGS` (after `postMeal2hRange: null,`):

```ts
  manualReminders: [],
  smartAfterMeal: { enabled: false, offset: '1h' },
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domain/models/reminder.ts src/domain/models/settings.ts
git commit -m "feat: reminder domain models and settings keys"
```

---

## Task 3: Pure schedule computation + tests (the tested core)

**Files:**
- Create: `src/domain/use-cases/reminder-schedule.ts`
- Test: `src/domain/use-cases/__tests__/reminder-schedule.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/use-cases/__tests__/reminder-schedule.test.ts`:

```ts
import type { ManualReminder } from '@/domain/models/reminder';
import { MealTiming, MealType } from '@/domain/models/meal';
import { RangeEvaluation } from '@/domain/models/target-range';
import type { Reading } from '@/domain/models/reading';
import {
  manualReminderTrigger,
  smartAfterMealFireAts,
  recheckFireAt,
} from '@/domain/use-cases/reminder-schedule';

const NOW = new Date(2026, 6, 11, 8, 0, 0); // 2026-07-11 08:00 local

function reading(overrides: Partial<Reading>): Reading {
  return {
    id: 'r1',
    value: 100,
    mealType: MealType.Lunch,
    mealTiming: MealTiming.Before,
    recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime(),
    createdAt: 0,
    updatedAt: 0,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('manualReminderTrigger', () => {
  it('maps a daily reminder to hour/minute', () => {
    const r: ManualReminder = { id: 'm1', label: 'Đói', time: '06:30', enabled: true, repeat: 'daily' };
    expect(manualReminderTrigger(r, NOW)).toEqual({ type: 'daily', hour: 6, minute: 30 });
  });

  it('maps a future one-time reminder to an absolute timestamp', () => {
    const r: ManualReminder = {
      id: 'm2', label: 'Khám', time: '09:15', enabled: true, repeat: 'once', date: '2026-07-20',
    };
    const at = new Date(2026, 6, 20, 9, 15, 0).getTime();
    expect(manualReminderTrigger(r, NOW)).toEqual({ type: 'date', at });
  });

  it('returns null for a one-time reminder whose datetime already passed', () => {
    const r: ManualReminder = {
      id: 'm3', label: 'Cũ', time: '07:00', enabled: true, repeat: 'once', date: '2026-07-11',
    };
    expect(manualReminderTrigger(r, NOW)).toBeNull(); // 07:00 < NOW 08:00
  });

  it('returns null for a disabled reminder', () => {
    const r: ManualReminder = { id: 'm4', label: 'Off', time: '06:30', enabled: false, repeat: 'daily' };
    expect(manualReminderTrigger(r, NOW)).toBeNull();
  });
});

describe('smartAfterMealFireAts', () => {
  it('returns nothing for an after-meal reading (anchor is BEFORE only)', () => {
    const after = reading({ mealTiming: MealTiming.After, hoursAfterMeal: 1 });
    expect(smartAfterMealFireAts(after, '1h', NOW)).toEqual([]);
  });

  it('schedules a single 1h offset from recordedAt', () => {
    const r = reading({ recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, '1h', NOW)).toEqual([
      { hoursAfterMeal: 1, at: new Date(2026, 6, 11, 13, 0, 0).getTime() },
    ]);
  });

  it('schedules both offsets when offset is "both"', () => {
    const r = reading({ recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, 'both', NOW)).toEqual([
      { hoursAfterMeal: 1, at: new Date(2026, 6, 11, 13, 0, 0).getTime() },
      { hoursAfterMeal: 2, at: new Date(2026, 6, 11, 14, 0, 0).getTime() },
    ]);
  });

  it('drops offsets whose fire time is already in the past', () => {
    // recordedAt 07:00, NOW 08:00 → 1h fire (08:00) is not > NOW, dropped; 2h (09:00) kept.
    const r = reading({ recordedAt: new Date(2026, 6, 11, 7, 0, 0).getTime() });
    expect(smartAfterMealFireAts(r, 'both', NOW)).toEqual([
      { hoursAfterMeal: 2, at: new Date(2026, 6, 11, 9, 0, 0).getTime() },
    ]);
  });
});

describe('recheckFireAt', () => {
  const base = reading({
    mealTiming: MealTiming.After,
    hoursAfterMeal: 1,
    recordedAt: new Date(2026, 6, 11, 12, 0, 0).getTime(),
  });

  it('schedules a +1h re-check for an out-of-range 1h reading under 1h+2h', () => {
    expect(recheckFireAt(base, '1h+2h', RangeEvaluation.High, NOW)).toBe(
      new Date(2026, 6, 11, 13, 0, 0).getTime(),
    );
  });

  it('returns null when the 1h reading is in range', () => {
    expect(recheckFireAt(base, '1h+2h', RangeEvaluation.InRange, NOW)).toBeNull();
  });

  it('returns null under a non-1h+2h protocol', () => {
    expect(recheckFireAt(base, '1h', RangeEvaluation.High, NOW)).toBeNull();
  });

  it('returns null when the re-check time is already in the past', () => {
    const old = reading({
      mealTiming: MealTiming.After, hoursAfterMeal: 1,
      recordedAt: new Date(2026, 6, 11, 6, 0, 0).getTime(), // +1h = 07:00 < NOW 08:00
    });
    expect(recheckFireAt(old, '1h+2h', RangeEvaluation.High, NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reminder-schedule`
Expected: FAIL with "Cannot find module '@/domain/use-cases/reminder-schedule'".

- [ ] **Step 3: Write the implementation**

Create `src/domain/use-cases/reminder-schedule.ts`:

```ts
import type { AfterMealProtocol } from '../models/condition';
import { MealTiming } from '../models/meal';
import type { ManualReminder, SmartOffset } from '../models/reminder';
import type { Reading } from '../models/reading';
import { RangeEvaluation } from '../models/target-range';

/** A repeating daily trigger at a local wall-clock time. */
export interface DailyTrigger {
  type: 'daily';
  hour: number;
  minute: number;
}
/** A one-shot trigger at an absolute instant. */
export interface DateTrigger {
  type: 'date';
  at: number; // epoch ms
}
export type ReminderTrigger = DailyTrigger | DateTrigger;

/** One scheduled smart after-meal fire. */
export interface SmartFire {
  hoursAfterMeal: number;
  at: number; // epoch ms
}

/** Parse "HH:mm" → [hour, minute]; NaN-safe callers pass validated UI input. */
function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':');
  return { hour: Number(h), minute: Number(m) };
}

/** Local calendar day "YYYY-MM-DD" + "HH:mm" → epoch ms in the device tz. */
function localDateTime(date: string, time: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const { hour, minute } = parseTime(time);
  return new Date(y as number, (mo as number) - 1, d as number, hour, minute, 0, 0).getTime();
}

/**
 * The trigger for a manual reminder, or null if it should not be scheduled
 * (disabled, or a one-time reminder whose instant has already passed).
 */
export function manualReminderTrigger(reminder: ManualReminder, now: Date): ReminderTrigger | null {
  if (!reminder.enabled) return null;
  if (reminder.repeat === 'once') {
    if (!reminder.date) return null;
    const at = localDateTime(reminder.date, reminder.time);
    return at > now.getTime() ? { type: 'date', at } : null;
  }
  const { hour, minute } = parseTime(reminder.time);
  return { type: 'daily', hour, minute };
}

function offsetHours(offset: SmartOffset): number[] {
  if (offset === 'both') return [1, 2];
  if (offset === '2h') return [2];
  return [1];
}

/**
 * Smart after-meal fires for a just-saved reading. Only BEFORE-meal readings
 * anchor smart reminders; each offset fires at recordedAt + offset hours.
 * Fires already in the past (relative to `now`) are dropped.
 */
export function smartAfterMealFireAts(
  reading: Reading,
  offset: SmartOffset,
  now: Date,
): SmartFire[] {
  if (reading.mealTiming !== MealTiming.Before) return [];
  const nowMs = now.getTime();
  return offsetHours(offset)
    .map((hoursAfterMeal) => ({
      hoursAfterMeal,
      at: reading.recordedAt + hoursAfterMeal * 3_600_000,
    }))
    .filter((fire) => fire.at > nowMs);
}

/**
 * The conditional +1h re-check instant for an out-of-range 1h after-meal reading
 * under the 1h+2h protocol, or null. In-range readings and other protocols → null.
 */
export function recheckFireAt(
  reading: Reading,
  protocol: AfterMealProtocol,
  evaluation: RangeEvaluation,
  now: Date,
): number | null {
  if (protocol !== '1h+2h') return null;
  if (reading.mealTiming !== MealTiming.After) return null;
  if (reading.hoursAfterMeal !== 1) return null;
  if (evaluation === RangeEvaluation.InRange) return null;
  const at = reading.recordedAt + 3_600_000;
  return at > now.getTime() ? at : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reminder-schedule`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add src/domain/use-cases/reminder-schedule.ts src/domain/use-cases/__tests__/reminder-schedule.test.ts
git commit -m "feat: pure reminder schedule computation with tests"
```

---

## Task 4: Wire the two new settings keys into the store

**Files:**
- Modify: `src/ui/hooks/use-settings.ts`

- [ ] **Step 1: Add both keys to the parallel initialize read**

In `src/ui/hooks/use-settings.ts`, inside `initialize`, extend the destructured array and the `Promise.all` list. Add `manualReminders` and `smartAfterMeal` to the destructuring (after `postMeal2hRange`):

```ts
      postMeal2hRange,
      manualReminders,
      smartAfterMeal,
    ] = await Promise.all([
```

and add the two reads to the `Promise.all` array (after the `postMeal2hRange` read):

```ts
      getSettingsRepo().get('postMeal2hRange'),
      getSettingsRepo().get('manualReminders'),
      getSettingsRepo().get('smartAfterMeal'),
    ]);
```

- [ ] **Step 2: Add both keys to the `set(...)` call**

In the same `set({ ... })` inside `initialize`, add (after `postMeal2hRange,`):

```ts
      postMeal2hRange,
      manualReminders,
      smartAfterMeal,
      isInitialized: true,
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm test -- use-settings`
Expected: PASS. (`updateSetting` is already generic over `keyof AppSettings`, so writing `manualReminders`/`smartAfterMeal` needs no change.)

- [ ] **Step 4: Commit**

```bash
git add src/ui/hooks/use-settings.ts
git commit -m "feat: load reminder settings in the store"
```

---

## Task 5: Notification service (data layer)

**Files:**
- Create: `src/data/notifications/notification-service.ts`

This is the only file that imports `expo-notifications`. It delegates all timing math to Task 3's pure functions, owns the identifier scheme, attaches i18n content, and is idempotent.

Identifier scheme:
- Manual reminder → `manual:{reminderId}`
- Smart after-meal fire → `smart:{readingId}:{hoursAfterMeal}` (e.g. `smart:abc:1`)
- Conditional re-check → `recheck:{readingId}`

- [ ] **Step 1: Create the service**

Create `src/data/notifications/notification-service.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AfterMealProtocol } from '@/domain/models/condition';
import type { ManualReminder, SmartAfterMeal } from '@/domain/models/reminder';
import type { Reading } from '@/domain/models/reading';
import type { RangeEvaluation } from '@/domain/models/target-range';
import {
  manualReminderTrigger,
  recheckFireAt,
  smartAfterMealFireAts,
} from '@/domain/use-cases/reminder-schedule';
import i18n from '@/i18n';

const ANDROID_CHANNEL_ID = 'reminders';

/** Data attached to every reminder; a tap reads this to deep-link into Log. */
export interface ReminderPayload {
  kind: 'manual' | 'smart' | 'recheck';
  mealType?: Reading['mealType'];
  mealTiming?: Reading['mealTiming'];
  hoursAfterMeal?: number;
}

/** Foreground display + Android channel. Call once at app boot. */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: i18n.t('reminders.channelName'),
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Request permission; returns true if granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function schedule(
  identifier: string,
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data: ReminderPayload,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data, ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}) },
    trigger,
  });
}

/**
 * Reconcile OS-scheduled manual reminders against `reminders`. Cancels every
 * `manual:*` id then reschedules the enabled/future ones. Idempotent — safe to
 * call after any edit. No-op effect if permission is not granted (OS silently
 * won't display, but we still record the schedule).
 */
export async function reconcileManualReminders(reminders: ManualReminder[]): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith('manual:'))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  const now = new Date();
  for (const reminder of reminders) {
    const trigger = manualReminderTrigger(reminder, now);
    if (!trigger) continue;
    const body = reminder.label.trim() || i18n.t('reminders.notif.manualFallback');
    await schedule(
      `manual:${reminder.id}`,
      i18n.t('reminders.notif.manualTitle'),
      body,
      trigger.type === 'daily'
        ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: trigger.hour, minute: trigger.minute }
        : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(trigger.at) },
      { kind: 'manual' },
    );
  }
}

/**
 * (Re)schedule smart after-meal + conditional re-check notifications for a saved
 * reading. Always cancels this reading's ids first (idempotent on re-save/edit).
 */
export async function syncRemindersForReading(
  reading: Reading,
  smart: SmartAfterMeal,
  protocol: AfterMealProtocol,
  evaluation: RangeEvaluation,
): Promise<void> {
  await cancelRemindersForReading(reading.id);
  const now = new Date();

  if (smart.enabled) {
    for (const fire of smartAfterMealFireAts(reading, smart.offset, now)) {
      await schedule(
        `smart:${reading.id}:${fire.hoursAfterMeal}`,
        i18n.t('reminders.notif.smartTitle'),
        i18n.t('reminders.notif.smartBody', {
          meal: i18n.t(`logForm.mealTypes.${reading.mealType}`),
        }),
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fire.at) },
        { kind: 'smart', mealType: reading.mealType, mealTiming: 'After', hoursAfterMeal: fire.hoursAfterMeal },
      );
    }
  }

  const recheck = recheckFireAt(reading, protocol, evaluation, now);
  if (recheck !== null) {
    await schedule(
      `recheck:${reading.id}`,
      i18n.t('reminders.notif.recheckTitle'),
      i18n.t('reminders.notif.recheckBody', {
        meal: i18n.t(`logForm.mealTypes.${reading.mealType}`),
      }),
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(recheck) },
      { kind: 'recheck', mealType: reading.mealType, mealTiming: 'After', hoursAfterMeal: 2 },
    );
  }
}

/** Cancel all smart + re-check notifications tied to a reading (used on delete). */
export async function cancelRemindersForReading(readingId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter(
        (n) =>
          n.identifier === `recheck:${readingId}` || n.identifier.startsWith(`smart:${readingId}:`),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** For the dev debug panel. */
export async function getAllScheduled(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS. If `channelId` is flagged on `content`, it is valid in expo-notifications ~0.32; if the installed types reject it, move `channelId` handling to the Android channel default (drop the spread) — the channel is still created in `configureNotifications`.

- [ ] **Step 3: Commit**

```bash
git add src/data/notifications/notification-service.ts
git commit -m "feat: notification service wrapping expo-notifications"
```

---

## Task 6: BottomSheet primitive

**Files:**
- Create: `src/ui/components/ui/bottom-sheet.tsx`
- Modify: `src/ui/components/ui/index.ts`

- [ ] **Step 1: Create the primitive**

Create `src/ui/components/ui/bottom-sheet.tsx` (mirrors the design's sheet: dim scrim, rounded top, grab handle, tap-scrim-to-close):

```tsx
import type { ReactElement, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme/theme-context';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps): ReactElement {
  const colors = useTheme(); // useTheme() returns the ColorScheme directly (same shape as static `colors`)
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="close">
        {/* Inner Pressable stops taps inside the sheet from closing it. */}
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
          <View style={[styles.grab, { backgroundColor: colors.borderStrong }]} />
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(27, 43, 36, 0.42)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    maxHeight: '88%',
  },
  grab: {
    width: 40,
    height: 5,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});
```

> Note: `useTheme()` returns per-mode colors (Session 10). Confirm the hook shape by opening `src/ui/theme/theme-context.tsx` — if it exposes colors under a different name (e.g. `{ theme }`), adapt the destructuring. Do not hardcode hex except the scrim overlay (matches the design's fixed scrim).

- [ ] **Step 2: Export it**

In `src/ui/components/ui/index.ts`, add (alphabetical, after `Badge` or wherever fits):

```ts
export { BottomSheet } from './bottom-sheet';
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/ui/bottom-sheet.tsx src/ui/components/ui/index.ts
git commit -m "feat: bottom sheet primitive"
```

---

## Task 7: Reminder editor sheet

**Files:**
- Create: `src/ui/components/reminder-editor-sheet.tsx`

The sheet edits a *draft* and hands the saved reminder back to the parent (the parent owns the list + persistence + reconcile). Fields: Reminder name, Time, Repeat, one-time date (context-aware label). Delete button only in edit mode.

- [ ] **Step 1: Create the component**

Create `src/ui/components/reminder-editor-sheet.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import type { ManualReminder, RepeatKind } from '@/domain/models/reminder';
import { AppText, BottomSheet, Button, SectionLabel, SegmentedControl } from '@/ui/components/ui';
import { radius, spacing, fontSize, fontFamily } from '@/ui/theme';
import { useTheme } from '@/ui/theme/theme-context';

/** Context for the one-time date label (pregnancy lifecycle → wording). */
export type ReminderDateContext = 'general' | 'gestational' | 'postpartum';

interface Props {
  visible: boolean;
  /** The reminder being edited, or undefined to create a new one. */
  reminder?: ManualReminder;
  dateContext: ReminderDateContext;
  onClose: () => void;
  onSave: (reminder: ManualReminder) => void;
  onDelete: (id: string) => void;
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y as number, (m as number) - 1, d as number);
}

function dateToISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ReminderEditorSheet({
  visible,
  reminder,
  dateContext,
  onClose,
  onSave,
  onDelete,
}: Props): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme(); // returns the ColorScheme directly
  const isEdit = reminder !== undefined;

  const [label, setLabel] = useState(reminder?.label ?? '');
  const [time, setTime] = useState(reminder?.time ?? '08:00');
  const [repeat, setRepeat] = useState<RepeatKind>(reminder?.repeat ?? 'daily');
  const [date, setDate] = useState(reminder?.date ?? todayISO());
  const [showPicker, setShowPicker] = useState<'time' | 'date' | null>(null);

  const dateLabel =
    dateContext === 'gestational'
      ? t('reminders.editor.dateLabel.pregnancy')
      : dateContext === 'postpartum'
        ? t('reminders.editor.dateLabel.postpartum')
        : t('reminders.editor.dateLabel.general');

  const handleSave = (): void => {
    onSave({
      id: reminder?.id ?? `m${Date.now()}`,
      label: label.trim() || t('reminders.editor.defaultName'),
      time,
      enabled: reminder?.enabled ?? true,
      repeat,
      date: repeat === 'once' ? date : undefined,
    });
  };

  const timeDate = (() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h as number, m as number, 0, 0);
    return d;
  })();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="title" weight="black">
        {isEdit ? t('reminders.editor.editTitle') : t('reminders.editor.newTitle')}
      </AppText>

      <SectionLabel style={styles.label}>{t('reminders.editor.nameLabel')}</SectionLabel>
      <TextInput
        style={[styles.input, { borderColor: colors.borderStrong, color: colors.text }]}
        value={label}
        onChangeText={setLabel}
        placeholder={t('reminders.editor.namePlaceholder')}
        placeholderTextColor={colors.textDisabled}
      />

      <SectionLabel style={styles.label}>{t('reminders.editor.timeLabel')}</SectionLabel>
      <TouchableOpacity
        style={[styles.input, styles.timeField, { borderColor: colors.borderStrong }]}
        onPress={() => setShowPicker('time')}
        accessibilityRole="button"
        accessibilityLabel={t('reminders.editor.timeLabel')}
      >
        <Ionicons name="time-outline" size={22} color={colors.primary} />
        <AppText weight="extrabold" style={styles.timeText}>
          {time}
        </AppText>
      </TouchableOpacity>

      <SectionLabel style={styles.label}>{t('reminders.editor.repeatLabel')}</SectionLabel>
      <SegmentedControl
        value={repeat}
        onChange={setRepeat}
        segments={[
          { value: 'daily', label: t('reminders.editor.repeatDaily') },
          { value: 'once', label: t('reminders.editor.repeatOnce') },
        ]}
      />

      {repeat === 'once' && (
        <>
          <SectionLabel style={styles.label}>{dateLabel}</SectionLabel>
          <TouchableOpacity
            style={[styles.input, styles.timeField, { borderColor: colors.borderStrong }]}
            onPress={() => setShowPicker('date')}
            accessibilityRole="button"
            accessibilityLabel={dateLabel}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <AppText weight="extrabold" style={styles.timeText}>
              {date}
            </AppText>
          </TouchableOpacity>
        </>
      )}

      <Button label={isEdit ? t('common.save') : t('reminders.editor.addButton')} onPress={handleSave} style={styles.save} />
      {isEdit && (
        <Button
          variant="dangerOutline"
          label={t('reminders.editor.delete')}
          onPress={() => onDelete(reminder.id)}
          style={styles.delete}
        />
      )}

      {showPicker === 'time' && (
        <DateTimePicker
          value={timeDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowPicker(null);
            if (d) setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
          }}
        />
      )}
      {showPicker === 'date' && (
        <DateTimePicker
          value={isoToDate(date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, d) => {
            setShowPicker(null);
            if (d) setDate(dateToISO(d));
          }}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: spacing.lg },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  timeText: { fontSize: fontSize.lg },
  save: { marginTop: spacing.xl },
  delete: { marginTop: spacing.sm },
});
```

> The editor is a controlled draft with local state. Because RN `useState` initializers run once, the sheet MUST be remounted per open — the parent gives it a `key` (see Task 8) so opening a different reminder re-seeds the draft.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS. If `Button` has no `dangerOutline` variant, confirm from `src/ui/components/ui/button.tsx` (Settings uses `variant="dangerOutline"`, so it exists).

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/reminder-editor-sheet.tsx
git commit -m "feat: reminder editor sheet"
```

---

## Task 8: Reminders screen (manual list + smart section)

**Files:**
- Create: `app/(tabs)/settings/reminders.tsx`

The screen is the source-of-truth UI: it reads `manualReminders` + `smartAfterMeal` from the store, persists edits via `updateSetting`, and calls `reconcileManualReminders` after every manual change. First enable requests permission. A denied state links to OS settings. A `__DEV__` panel dumps scheduled notifications (acceptance-criteria assertion surface). A `?new=1` param auto-opens the create sheet (Session 12's Today "Add a reminder" button navigates here with it).

- [ ] **Step 1: Create the screen**

Create `app/(tabs)/settings/reminders.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ConditionType } from '@/domain/models/condition';
import type { ManualReminder, SmartOffset } from '@/domain/models/reminder';
import {
  getAllScheduled,
  getPermissionStatus,
  reconcileManualReminders,
  requestNotificationPermission,
} from '@/data/notifications/notification-service';
import { AppText, Button, Card, Notice, SectionLabel, SegmentedControl, Toggle } from '@/ui/components/ui';
import {
  ReminderEditorSheet,
  type ReminderDateContext,
} from '@/ui/components/reminder-editor-sheet';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, radius, spacing } from '@/ui/theme';

export default function RemindersScreen(): ReactElement {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ new?: string }>();
  const { manualReminders, smartAfterMeal, conditionType, dueDate, updateSetting } =
    useSettingsStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ManualReminder | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [debug, setDebug] = useState<string[]>([]);

  // Session 21 sets babyBornAt; until then postpartum is unreachable → 'gestational'/'general'.
  const dateContext: ReminderDateContext =
    conditionType === ConditionType.Gestational ? 'gestational' : 'general';

  const refreshDebug = useCallback(async (): Promise<void> => {
    if (!__DEV__) return;
    const all = await getAllScheduled();
    setDebug(all.map((n) => n.identifier));
  }, []);

  useEffect(() => {
    void refreshDebug();
  }, [refreshDebug]);

  // Deep-link: open the create sheet when navigated with ?new=1.
  useEffect(() => {
    if (params.new === '1') {
      setEditing(undefined);
      setEditorOpen(true);
    }
  }, [params.new]);

  /** Ensure permission before anything can actually fire. Returns granted. */
  const ensurePermission = async (): Promise<boolean> => {
    const status = await getPermissionStatus();
    if (status === 'granted') return true;
    const granted = await requestNotificationPermission();
    setPermissionDenied(!granted);
    return granted;
  };

  const persistManual = async (list: ManualReminder[]): Promise<void> => {
    await updateSetting('manualReminders', list);
    await reconcileManualReminders(list);
    await refreshDebug();
  };

  const handleSave = async (reminder: ManualReminder): Promise<void> => {
    await ensurePermission();
    const exists = manualReminders.some((r) => r.id === reminder.id);
    const list = exists
      ? manualReminders.map((r) => (r.id === reminder.id ? reminder : r))
      : [...manualReminders, reminder];
    await persistManual(list);
    setEditorOpen(false);
  };

  const handleDelete = async (id: string): Promise<void> => {
    await persistManual(manualReminders.filter((r) => r.id !== id));
    setEditorOpen(false);
  };

  const handleToggle = async (reminder: ManualReminder, enabled: boolean): Promise<void> => {
    if (enabled) await ensurePermission();
    await persistManual(
      manualReminders.map((r) => (r.id === reminder.id ? { ...r, enabled } : r)),
    );
  };

  const handleSmartToggle = async (enabled: boolean): Promise<void> => {
    if (enabled) await ensurePermission();
    await updateSetting('smartAfterMeal', { ...smartAfterMeal, enabled });
  };

  const handleSmartOffset = async (offset: SmartOffset): Promise<void> => {
    await updateSetting('smartAfterMeal', { ...smartAfterMeal, offset });
  };

  const smartHelper = !smartAfterMeal.enabled
    ? t('reminders.smart.helperOff')
    : smartAfterMeal.offset === 'both'
      ? t('reminders.smart.helperBoth')
      : smartAfterMeal.offset === '2h'
        ? t('reminders.smart.helper2h')
        : t('reminders.smart.helper1h');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {permissionDenied && (
        <Notice
          tone="warn"
          message={t('reminders.permissionDenied')}
          style={styles.notice}
          onPress={() => void Linking.openSettings()}
        />
      )}

      <SectionLabel style={styles.sectionLabel}>{t('reminders.manual.section')}</SectionLabel>
      <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
        {t('reminders.manual.hint')}
      </AppText>
      <Card style={styles.group}>
        {manualReminders.map((r, i) => (
          <View
            key={r.id}
            style={[styles.row, i < manualReminders.length - 1 && styles.rowBorder]}
          >
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => {
                setEditing(r);
                setEditorOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={r.label}
            >
              <View style={styles.timePill}>
                <AppText weight="black" color={colors.primary}>
                  {r.time}
                </AppText>
              </View>
              <View style={styles.rowText}>
                <AppText weight="bold" numberOfLines={1}>
                  {r.label}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {r.repeat === 'once'
                    ? t('reminders.manual.onceLabel', { date: r.date })
                    : t('reminders.manual.dailyLabel')}
                </AppText>
              </View>
            </TouchableOpacity>
            <Toggle
              value={r.enabled}
              onValueChange={(v) => void handleToggle(r, v)}
              accessibilityLabel={r.label}
            />
          </View>
        ))}
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => {
            setEditing(undefined);
            setEditorOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('reminders.manual.add')}
        >
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <AppText weight="extrabold" color={colors.primary}>
            {t('reminders.manual.add')}
          </AppText>
        </TouchableOpacity>
      </Card>

      <SectionLabel style={styles.sectionLabel}>{t('reminders.smart.section')}</SectionLabel>
      <Card style={styles.smartCard}>
        <View style={styles.smartHeader}>
          <Ionicons name="restaurant" size={24} color={colors.accentOrange} />
          <View style={styles.rowText}>
            <AppText weight="extrabold">{t('reminders.smart.title')}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('reminders.smart.subtitle')}
            </AppText>
          </View>
          <Toggle
            value={smartAfterMeal.enabled}
            onValueChange={(v) => void handleSmartToggle(v)}
            accessibilityLabel={t('reminders.smart.title')}
          />
        </View>
        {smartAfterMeal.enabled && (
          <SegmentedControl
            value={smartAfterMeal.offset}
            onChange={(v) => void handleSmartOffset(v)}
            style={styles.smartSeg}
            segments={[
              { value: '1h', label: t('reminders.smart.offset1h') },
              { value: '2h', label: t('reminders.smart.offset2h') },
              { value: 'both', label: t('reminders.smart.offsetBoth') },
            ]}
          />
        )}
      </Card>
      <AppText color={colors.textMuted} style={styles.smartHelper}>
        {smartHelper}
      </AppText>

      {__DEV__ && debug.length > 0 && (
        <Card style={styles.debug}>
          <AppText variant="caption" weight="bold">
            DEV · scheduled ({debug.length})
          </AppText>
          {debug.map((id) => (
            <AppText key={id} variant="caption" color={colors.textMuted}>
              {id}
            </AppText>
          ))}
        </Card>
      )}

      <ReminderEditorSheet
        key={editing?.id ?? 'new'}
        visible={editorOpen}
        reminder={editing}
        dateContext={dateContext}
        onClose={() => setEditorOpen(false)}
        onSave={(r) => void handleSave(r)}
        onDelete={(id) => void handleDelete(id)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  notice: { marginBottom: spacing.md },
  sectionLabel: { marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: spacing.xs },
  hint: { marginLeft: spacing.xs, marginBottom: spacing.xs },
  group: { padding: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
  timePill: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowText: { flex: 1, minWidth: 0 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  smartCard: { gap: spacing.md },
  smartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  smartSeg: { marginTop: spacing.xs },
  smartHelper: { marginTop: spacing.sm, marginLeft: spacing.xs, lineHeight: 22 },
  debug: { marginTop: spacing.xl, gap: 2 },
});
```

> `colors` imported statically here is the default (Evergreen) token module used elsewhere in Settings screens (see `settings/index.tsx`). Per-mode theming of these screens follows the existing Settings pattern — do NOT introduce `useTheme` here unless the other Settings screens already use it. `colors.surface` must exist; if the token is named differently, reconcile against `src/ui/theme/colors.ts`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS. Confirm `Notice` accepts an `onPress` prop; if not, wrap it in a `TouchableOpacity` instead.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/settings/reminders.tsx"
git commit -m "feat: reminders screen with manual list and smart section"
```

---

## Task 9: Settings row + route registration + i18n scaffolding

**Files:**
- Modify: `app/(tabs)/settings/index.tsx`
- Modify: `app/(tabs)/settings/_layout.tsx`
- Modify: `src/i18n/vi.json`, `src/i18n/en.json`

- [ ] **Step 1: Register the screen title**

In `app/(tabs)/settings/_layout.tsx`, add a `Stack.Screen` (after `tracking-mode`):

```tsx
      <Stack.Screen name="reminders" options={{ title: t('reminders.title') }} />
```

- [ ] **Step 2: Add the Settings row (all modes)**

In `app/(tabs)/settings/index.tsx`, add a row in the "preferences" `Card`, right after the tracking-mode row (before the unit row):

```tsx
        <SettingRow
          icon="alarm"
          iconColor={colors.accentOrange}
          label={t('screens.settings.index.rows.reminders')}
          onPress={() => router.push('/(tabs)/settings/reminders')}
        />
```

- [ ] **Step 3: Add the i18n strings (vi)**

In `src/i18n/vi.json`, add a top-level `"reminders"` block (sibling of `"logForm"`):

```json
  "reminders": {
    "title": "Nhắc đo đường huyết",
    "channelName": "Nhắc đo đường huyết",
    "permissionDenied": "Thông báo đang tắt. Nhấn để mở cài đặt và bật lại.",
    "manual": {
      "section": "Nhắc đo",
      "hint": "Nhấn vào một lời nhắc để đổi tên hoặc giờ.",
      "add": "Thêm lời nhắc",
      "dailyLabel": "Mỗi ngày",
      "onceLabel": "Một lần · {{date}}"
    },
    "smart": {
      "section": "Nhắc đo sau ăn thông minh",
      "title": "Nhắc đo sau mỗi bữa",
      "subtitle": "Tự tính giờ nhắc theo lúc mẹ ăn",
      "offset1h": "1 giờ",
      "offset2h": "2 giờ",
      "offsetBoth": "Cả hai",
      "helperOff": "Nhắc thông minh đang tắt. Các lời nhắc thủ công phía trên vẫn hoạt động.",
      "helper1h": "Khi mẹ ghi chỉ số trước ăn, Sugar sẽ nhắc đo lại sau bữa 1 giờ 🌿",
      "helper2h": "Khi mẹ ghi chỉ số trước ăn, Sugar sẽ nhắc đo lại sau bữa 2 giờ 🌿",
      "helperBoth": "Khi mẹ ghi chỉ số trước ăn, Sugar sẽ nhắc đo lại sau bữa 1 giờ và 2 giờ 🌿"
    },
    "editor": {
      "newTitle": "Lời nhắc mới",
      "editTitle": "Sửa lời nhắc",
      "nameLabel": "Tên lời nhắc",
      "namePlaceholder": "vd: Đo lúc đói · sáng sớm",
      "defaultName": "Nhắc đo",
      "timeLabel": "Giờ",
      "repeatLabel": "Lặp lại",
      "repeatDaily": "Mỗi ngày",
      "repeatOnce": "Một lần",
      "dateLabel": {
        "general": "Ngày cụ thể",
        "pregnancy": "Ngày đặc biệt trong thai kỳ",
        "postpartum": "Ngày sau sinh"
      },
      "addButton": "Thêm lời nhắc",
      "delete": "Xoá lời nhắc"
    },
    "notif": {
      "manualTitle": "Sugar 🌿",
      "manualFallback": "Đến giờ đo đường huyết rồi mẹ ơi",
      "smartTitle": "Đến giờ đo sau ăn 🌿",
      "smartBody": "Đến giờ đo sau {{meal}} rồi mẹ ơi 🌿",
      "recheckTitle": "Đo lại nhé mẹ 🌿",
      "recheckBody": "Chỉ số sau {{meal}} hơi cao — đo lại lúc 2 giờ giúp mẹ theo dõi nhé 🌿"
    },
    "onboarding": {
      "title": "Bật nhắc đo?",
      "body": "Sugar sẽ nhắc mẹ đo đúng giờ, kể cả khi đóng app. Mẹ có thể chỉnh sau trong Cài đặt.",
      "enable": "Bật nhắc đo",
      "skip": "Để sau"
    }
  },
```

Also add, inside `screens.settings.index.rows`, a `reminders` key:

```json
        "reminders": "Nhắc đo đường huyết",
```

- [ ] **Step 4: Add the i18n strings (en)**

In `src/i18n/en.json`, add the mirror `"reminders"` block:

```json
  "reminders": {
    "title": "Measurement reminders",
    "channelName": "Measurement reminders",
    "permissionDenied": "Notifications are off. Tap to open settings and turn them on.",
    "manual": {
      "section": "Reminders",
      "hint": "Tap a reminder to edit its name or time.",
      "add": "Add reminder",
      "dailyLabel": "Every day",
      "onceLabel": "One time · {{date}}"
    },
    "smart": {
      "section": "Smart after-meal reminders",
      "title": "Remind me after each meal",
      "subtitle": "Times each reminder to when you eat",
      "offset1h": "1 hour",
      "offset2h": "2 hours",
      "offsetBoth": "Both",
      "helperOff": "Smart reminders are off. Your manual reminders above still ring.",
      "helper1h": "When you log a before-meal reading, Sugar reminds you to measure 1 hour after 🌿",
      "helper2h": "When you log a before-meal reading, Sugar reminds you to measure 2 hours after 🌿",
      "helperBoth": "When you log a before-meal reading, Sugar reminds you to measure 1 hour and again 2 hours after 🌿"
    },
    "editor": {
      "newTitle": "New reminder",
      "editTitle": "Edit reminder",
      "nameLabel": "Reminder name",
      "namePlaceholder": "e.g. Fasting · on waking",
      "defaultName": "Reminder",
      "timeLabel": "Time",
      "repeatLabel": "Repeat",
      "repeatDaily": "Every day",
      "repeatOnce": "One time only",
      "dateLabel": {
        "general": "Specific date",
        "pregnancy": "Special pregnancy date",
        "postpartum": "Postpartum date"
      },
      "addButton": "Add reminder",
      "delete": "Delete reminder"
    },
    "notif": {
      "manualTitle": "Sugar 🌿",
      "manualFallback": "Time to check your blood sugar",
      "smartTitle": "Time to measure after your meal 🌿",
      "smartBody": "Time to measure after {{meal}} 🌿",
      "recheckTitle": "Time for a re-check 🌿",
      "recheckBody": "Your reading after {{meal}} was a little high — a 2-hour re-check helps you keep track 🌿"
    },
    "onboarding": {
      "title": "Turn on reminders?",
      "body": "Sugar can remind you to measure on time, even when the app is closed. You can change this later in Settings.",
      "enable": "Turn on reminders",
      "skip": "Later"
    }
  },
```

Add, inside `screens.settings.index.rows` (en):

```json
        "reminders": "Measurement reminders",
```

- [ ] **Step 5: Verify strings load + no JSON syntax errors**

Run: `npx tsc --noEmit && npm test`
Expected: PASS. (Malformed JSON fails the i18n import at test load.)

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/settings/index.tsx" "app/(tabs)/settings/_layout.tsx" src/i18n/vi.json src/i18n/en.json
git commit -m "feat: reminders settings row, route, and i18n"
```

---

## Task 10: Deep-link params contract + Log form prefill

**Files:**
- Create: `src/ui/utils/log-prefill.ts`
- Modify: `src/ui/components/log-reading-form.tsx`
- Modify: `app/(tabs)/index.tsx`

The notification tap (Task 11) routes to the Log tab with these params. Session 12's Today slots reuse the identical contract.

- [ ] **Step 1: Create the contract module**

Create `src/ui/utils/log-prefill.ts`:

```ts
import { type MealTiming, type MealType, MealType as MealTypes, MealTiming as MealTimings } from '@/domain/models/meal';

/** Prefill applied to a fresh Log form (never carries a reading id — always a new entry). */
export interface LogPrefill {
  mealType?: MealType;
  mealTiming?: MealTiming;
  hoursAfterMeal?: number;
}

/** Router params are all strings; parse defensively (unknown values ignored). */
export function parseLogPrefill(params: Record<string, unknown>): LogPrefill {
  const prefill: LogPrefill = {};
  const mt = params.mealType;
  if (typeof mt === 'string' && (Object.values(MealTypes) as string[]).includes(mt)) {
    prefill.mealType = mt as MealType;
  }
  const timing = params.mealTiming;
  if (typeof timing === 'string' && (Object.values(MealTimings) as string[]).includes(timing)) {
    prefill.mealTiming = timing as MealTiming;
  }
  const hours = params.hoursAfterMeal;
  if (typeof hours === 'string' && /^[0-6]$/.test(hours)) {
    prefill.hoursAfterMeal = Number(hours);
  }
  return prefill;
}

/** Serialize a payload → router params for `router.push`. Used by notification taps + Session 12. */
export function toLogParams(prefill: LogPrefill): Record<string, string> {
  const params: Record<string, string> = {};
  if (prefill.mealType) params.mealType = prefill.mealType;
  if (prefill.mealTiming) params.mealTiming = prefill.mealTiming;
  if (prefill.hoursAfterMeal !== undefined) params.hoursAfterMeal = String(prefill.hoursAfterMeal);
  return params;
}
```

- [ ] **Step 2: Add the `prefill` prop to the Log form**

In `src/ui/components/log-reading-form.tsx`:

Add the import near the other domain imports:
```ts
import type { LogPrefill } from '@/ui/utils/log-prefill';
```

Extend `LogReadingFormProps`:
```ts
interface LogReadingFormProps {
  /** When provided, the form runs in edit mode: prefilled and saving via updateReading. */
  initialReading?: Reading;
  /** Create-mode prefill from a deep link (notification tap / Today slot). Ignored in edit mode. */
  prefill?: LogPrefill;
  /** Called after a successful save in edit mode (create mode resets the form instead). */
  onSaved?: (reading: Reading) => void;
}
```

Destructure it:
```ts
export function LogReadingForm({
  initialReading,
  prefill,
  onSaved,
}: LogReadingFormProps = {}): React.JSX.Element {
```

Seed the initial state from `prefill` (create mode only). Change the three `useState` initializers:

```ts
  const [mealType, setMealType] = useState<MealType>(
    () => initialReading?.mealType ?? prefill?.mealType ?? getDefaultMealType(new Date()),
  );
  // A deep-link meal type counts as an explicit choice, so time changes don't clobber it.
  const [isMealTypeManual, setIsMealTypeManual] = useState(isEdit || prefill?.mealType !== undefined);
  const [mealTiming, setMealTiming] = useState<MealTiming>(
    initialReading?.mealTiming ?? prefill?.mealTiming ?? MealTiming.Before,
  );
  const [hoursAfterMeal, setHoursAfterMeal] = useState(
    initialReading?.hoursAfterMeal ?? prefill?.hoursAfterMeal ?? 2,
  );
```

- [ ] **Step 3: Read the params in the Log screen**

In `app/(tabs)/index.tsx`, add imports:
```ts
import { useLocalSearchParams } from 'expo-router';
import { parseLogPrefill } from '@/ui/utils/log-prefill';
```

Inside `LogScreen`, read + parse:
```ts
  const params = useLocalSearchParams();
  const prefill = parseLogPrefill(params);
```

Pass it to the form:
```tsx
          <LogReadingForm prefill={prefill} />
```

> Note: `useLocalSearchParams` re-parses on every navigation; because the form's state is seeded once at mount, a second deep link while the Log tab is already mounted won't re-seed. That is acceptable for Session 11 (tap flow lands on a fresh screen). Session 12 will remount via `key` if it needs re-seeding — do not over-engineer here.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/utils/log-prefill.ts src/ui/components/log-reading-form.tsx "app/(tabs)/index.tsx"
git commit -m "feat: log deep-link params contract and form prefill"
```

---

## Task 11: Notification handler + response deep-link + save/delete hooks

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `src/ui/components/log-reading-form.tsx`
- Modify: `app/(tabs)/history/[id]/index.tsx`

- [ ] **Step 1: Configure notifications + response listener at boot**

In `app/_layout.tsx`, add imports:
```ts
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { configureNotifications, type ReminderPayload } from '@/data/notifications/notification-service';
import { toLogParams } from '@/ui/utils/log-prefill';
```

Call `configureNotifications()` once. Add inside `RootLayoutReady`, after the existing effects:

```ts
  const router = useRouter();

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(() => {
    const routeFromPayload = (payload: ReminderPayload | undefined): void => {
      if (!payload || payload.kind === 'manual') {
        router.push('/(tabs)');
        return;
      }
      router.push({
        pathname: '/(tabs)',
        params: toLogParams({
          mealType: payload.mealType,
          mealTiming: payload.mealTiming,
          hoursAfterMeal: payload.hoursAfterMeal,
        }),
      });
    };

    // Cold start: app opened by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        routeFromPayload(response.notification.request.content.data as ReminderPayload);
      }
    });

    // Warm: tapped while running.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromPayload(response.notification.request.content.data as ReminderPayload);
    });
    return () => sub.remove();
  }, [router]);
```

> Place these effects where `isDbReady`/`isInitialized` are already true (i.e. after the boot gate in `RootLayoutReady`, but they can safely run unconditionally — routing to `(tabs)` only takes effect once the router mounts). If routing fires before the tabs mount, expo-router queues it; no guard needed.

- [ ] **Step 2: Schedule smart reminders after a successful create**

In `src/ui/components/log-reading-form.tsx`, add imports:
```ts
import { syncRemindersForReading } from '@/data/notifications/notification-service';
```

Pull the extra settings the scheduling needs. Extend the store destructure:
```ts
  const {
    preferredUnit,
    preferredLanguage,
    fastingRange,
    postMealRange,
    postMeal2hRange,
    afterMealProtocol,
    smartAfterMeal,
    alertsEnabled,
    updateSetting,
  } = useSettingsStore();
```

In `performSave`, evaluate with the full range set (including 2h), and after a successful save schedule reminders. Replace the `evaluateReading` block and add scheduling:

```ts
      const evaluation = evaluateReading(reading, {
        fasting: fastingRange,
        postMeal: postMealRange,
        postMeal2h: postMeal2hRange ?? undefined,
      });
      // Smart after-meal + conditional re-check scheduling (create OR edit — idempotent
      // per reading id). Fire-and-forget; a scheduling failure never blocks the save UX.
      void syncRemindersForReading(reading, smartAfterMeal, afterMealProtocol, evaluation).catch(
        (err) => console.warn('reminder scheduling failed', err),
      );
      // Out-of-range success still saved — warn haptic; in-range → success.
      void (evaluation === RangeEvaluation.InRange ? haptics.success() : haptics.warning());
      showSavedAlert(reading, evaluation);
```

> `TargetRanges` already has an optional `postMeal2h` (see `evaluate-reading.ts`), so passing it is type-safe. This also fixes an existing latent gap where the Log alert ignored the 2h range for gestational users — a correct improvement, not a regression (General mode has `postMeal2hRange === null`, so behavior is byte-identical there).

- [ ] **Step 3: Cancel a reading's reminders on delete**

Open `app/(tabs)/history/[id]/index.tsx`. Find where the reading is deleted (the `deleteReading` call). Add the import:
```ts
import { cancelRemindersForReading } from '@/data/notifications/notification-service';
```

Immediately after the successful `deleteReading(...)` await, add:
```ts
      void cancelRemindersForReading(id); // reading id being deleted
```

(Use whatever the local variable for the reading id is on that screen — confirm by reading the file; it is the route param `id`.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx src/ui/components/log-reading-form.tsx "app/(tabs)/history/[id]/index.tsx"
git commit -m "feat: notification deep-link and smart reminder save/delete hooks"
```

---

## Task 12: GDM onboarding — seed reminder + "Bật nhắc đo?" step

**Files:**
- Modify: `app/onboarding.tsx`

GDM finish seeds a `06:30` "Đo lúc đói" reminder + the smart default offset from protocol, then shows a skippable "Bật nhắc đo?" step. General is untouched (seeds nothing, default-off).

- [ ] **Step 1: Read the current onboarding structure**

Run: `sed -n '1,120p' app/onboarding.tsx` — confirm the `Step` union, `finishGestational`, `finishGeneral`, and how the screen navigates to `(tabs)` (likely `router.replace('/(tabs)')` after `updateSetting('onboardingDone', true)`).

- [ ] **Step 2: Extend the Step union + add the reminders step**

Change:
```ts
type Step = 'welcome' | 'condition' | 'gdm';
```
to:
```ts
type Step = 'welcome' | 'condition' | 'gdm' | 'remind';
```

Add imports:
```ts
import { smartOffsetForProtocol } from '@/domain/models/reminder';
import {
  reconcileManualReminders,
  requestNotificationPermission,
} from '@/data/notifications/notification-service';
```

- [ ] **Step 3: Seed reminders in `finishGestational`, then go to the remind step**

Locate `finishGestational`. It currently applies the preset and finishes. Change it so it seeds reminders and advances to `'remind'` instead of navigating away. The seeded reminder + smart default are written via `updateSetting` (the store already has `manualReminders`/`smartAfterMeal`). Use the selected protocol from the gdm step (the component already tracks it — confirm the state variable name, referred to as `protocol` below):

The current body (confirmed) is:
```ts
  const finishGestational = async (): Promise<void> => {
    await applyConditionPreset(ConditionType.Gestational);
    await updateSetting('dueDate', dueDate.getTime());
    await updateSetting('afterMealProtocol', protocol);
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };
```

Rewrite it to KEEP the dueDate + protocol writes, seed reminders, and advance to `'remind'` instead of finishing (the remind step now owns `onboardingDone` + navigation):
```ts
  const finishGestational = async (): Promise<void> => {
    await applyConditionPreset(ConditionType.Gestational);
    await updateSetting('dueDate', dueDate.getTime());
    await updateSetting('afterMealProtocol', protocol);
    await updateSetting('manualReminders', [
      { id: `m${Date.now()}`, label: t('screens.onboarding.remind.fastingLabel'), time: '06:30', enabled: true, repeat: 'daily' },
    ]);
    await updateSetting('smartAfterMeal', { enabled: false, offset: smartOffsetForProtocol(protocol) });
    setStep('remind');
  };
```

`protocol` is an existing `useState<AfterMealProtocol>` in the component (line ~33); `updateSetting`/`applyConditionPreset`/`dueDate` are all already in scope. Note the `onboardingDone: true` + `router.replace` moved OUT of this function into `completeOnboarding` (next step).

- [ ] **Step 4: Add the remind step handlers + finalize helper**

Add a shared finalize (whatever `finishGeneral` currently does to leave onboarding — reuse it). If `finishGeneral` both applies the general preset AND navigates, factor the navigation into a `completeOnboarding` helper and call it from both `finishGeneral` and the remind-step buttons:

```ts
  const completeOnboarding = async (): Promise<void> => {
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  const enableRemindersAndFinish = async (): Promise<void> => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await updateSetting('smartAfterMeal', { ...useSettingsStore.getState().smartAfterMeal, enabled: true });
      await reconcileManualReminders(useSettingsStore.getState().manualReminders);
    }
    await completeOnboarding();
  };
```

Update `finishGeneral` to call `completeOnboarding()` for its final navigation (keep its `applyConditionPreset(ConditionType.General)` call). Confirm the exact current body when editing — do not remove the preset application.

- [ ] **Step 5: Render the remind step**

After the `{step === 'gdm' && ( ... )}` block, add:

```tsx
        {step === 'remind' && (
          <View style={styles.step}>
            <View style={styles.remindIcon}>
              <Ionicons name="notifications" size={48} color={colors.primary} />
            </View>
            <AppText variant="title" style={styles.stepTitle}>
              {t('screens.onboarding.remind.title')}
            </AppText>
            <AppText color={colors.textMuted} style={styles.remindBody}>
              {t('screens.onboarding.remind.body')}
            </AppText>
            <Button
              variant="primary"
              uppercase
              label={t('screens.onboarding.remind.enable')}
              onPress={() => void enableRemindersAndFinish()}
            />
            <Button
              variant="ghost"
              label={t('screens.onboarding.remind.skip')}
              onPress={() => void completeOnboarding()}
              style={styles.remindSkip}
            />
          </View>
        )}
```

Add `Ionicons` import if missing (`import { Ionicons } from '@expo/vector-icons';`) and the styles:
```ts
  remindIcon: { alignSelf: 'center', marginBottom: spacing.md },
  remindBody: { marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 24 },
  remindSkip: { marginTop: spacing.sm },
```

> Confirm `Button` has a `ghost` variant; if not, use `variant="secondary"` or a plain `TouchableOpacity` matching the design's skip links. Reconcile against `src/ui/components/ui/button.tsx`.

- [ ] **Step 6: Add the onboarding i18n keys**

In `src/i18n/vi.json`, under `screens.onboarding`, add:
```json
      "remind": {
        "title": "Bật nhắc đo?",
        "body": "Sugar sẽ nhắc mẹ đo đúng giờ, kể cả khi đóng app. Mẹ có thể chỉnh sau trong Cài đặt.",
        "enable": "Bật nhắc đo",
        "skip": "Để sau",
        "fastingLabel": "Đo lúc đói"
      }
```

In `src/i18n/en.json`, under `screens.onboarding`, add:
```json
      "remind": {
        "title": "Turn on reminders?",
        "body": "Sugar can remind you to measure on time, even when the app is closed. You can change this later in Settings.",
        "enable": "Turn on reminders",
        "skip": "Later",
        "fastingLabel": "Fasting check"
      }
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/onboarding.tsx src/i18n/vi.json src/i18n/en.json
git commit -m "feat: gdm onboarding seeds reminder and offers to enable notifications"
```

---

## Task 13: Manual device verification (physical device required)

Local notifications with the app killed CANNOT be verified in a simulator reliably or in unit tests. This task is a manual checklist run on a physical Android device (primary target) via an EAS/dev build or `expo run:android`.

- [ ] **Step 1: Build + install on a physical device**

Run: `npx expo run:android` (or an EAS dev build). Grant notification permission when prompted.

- [ ] **Step 2: Manual reminder fires with app killed**

Add a reminder ~2 min out (daily), force-kill the app, wait. Expected: notification appears; tapping it opens the app on the Log tab (manual → no prefill).

- [ ] **Step 3: Before-meal save schedules the configured one-shots**

Enable smart after-meal (offset `both`). Log a `Before` reading. Open the reminders screen → the `__DEV__` panel lists `smart:{id}:1` and `smart:{id}:2`. Expected: exactly the configured offsets appear.

- [ ] **Step 4: Conditional re-check under 1h+2h**

Set mode gestational + protocol `1h+2h`. Log an `After` reading, `hoursAfterMeal=1`, value out of range (e.g. 180). DEV panel shows `recheck:{id}`. Log another in range → no `recheck:*`.

- [ ] **Step 5: Edit/delete touches only the right identifier**

Edit a manual reminder's time → DEV panel shows the same `manual:{id}` with the new time (count unchanged). Delete a reading → its `smart:*`/`recheck:*` ids disappear; other readings' ids untouched.

- [ ] **Step 6: Denied-permission state renders + recovers**

Deny permission at OS level. Toggle a reminder on → the denied `Notice` appears and links to OS settings. Re-grant → toggling reconciles and schedules.

- [ ] **Step 7: Notification tap deep-links to prefilled Log**

Tap a `smart` notification → Log opens with mealType + mealTiming=After + hoursAfterMeal prefilled; Save works in ≤3 taps.

- [ ] **Step 8: 1.3× font scale**

Set device font to 1.3× → reminders screen + editor sheet remain usable (no clipped labels).

Record any failures and fix before the final commit. No commit for this task (verification only).

---

## Task 14: Final verification + session commit

- [ ] **Step 1: Full type + test pass**

Run: `npx tsc --noEmit && npm test && npm run lint`
Expected: all PASS. Fix anything red.

- [ ] **Step 2: Confirm no dead i18n keys / no hardcoded strings**

Run: `rg --color=never --no-heading -n "reminders\." src/i18n/vi.json src/i18n/en.json | wc -l` — vi and en counts must match.
Manually scan the new screens/components: every user-facing string goes through `t(...)`.

- [ ] **Step 3: Confirm App boots + reminders reachable**

Run the app; Settings → "Nhắc đo đường huyết" opens the screen for both a general and a gestational profile.

- [ ] **Step 4: Session commit (if any uncommitted changes remain)**

The per-task commits already cover the work. If Task 13 fixes produced changes, commit them:

```bash
git add -A
git commit -m "feat: manual and smart meal-anchored reminders"
```

---

## Self-Review notes (spec coverage)

- **Manual reminders (add/edit/delete, tap-to-edit, delete-in-sheet):** Tasks 7–8. ✅
- **Edit sheet fields (name/time/repeat/context date):** Task 7. ✅
- **Smart after-meal (toggle + 1h/2h/both, default from protocol):** Tasks 3, 8, 12. ✅
- **Scheduling: manual daily/once, smart one-shots, conditional 1h+2h re-check:** Tasks 3 (pure), 5 (service), 11 (hook). ✅
- **Notification tap → prefilled Log deep link (contract reused by S12):** Tasks 10–11. ✅
- **Permission flow + denied state + OS-settings link:** Tasks 5, 8. ✅
- **GDM onboarding "Bật nhắc đo?" + seeded fasting reminder; General default-off:** Task 12. ✅
- **Reminders in Settings for all modes:** Task 9. ✅
- **All strings i18n vi+en:** Tasks 9, 12. ✅
- **Acceptance: fire with app killed, DEV-panel assertion via `getAllScheduledNotificationsAsync`, idempotent edit/delete, tsc+tests green (schedule pure-tested):** Tasks 3, 8, 13, 14. ✅

**Deferred to Session 12 (correctly NOT built here):** the Today tab itself and its 3-variant "Add a reminder" buttons. The reminders screen already accepts `?new=1` to auto-open the create sheet, so Session 12 only needs to navigate here with that param — the seam is in place. This is called out in Task 8.

**One deviation flagged:** Task 11 Step 2 makes the Log-form save alert honor the 2h range (`postMeal2h`) for gestational users. This was already the correct behavior per `evaluateReading` but the form wasn't passing the 2h range. General mode is byte-identical (its `postMeal2hRange` is null). Recorded here so the reviewer expects it.
