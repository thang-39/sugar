# Session 3 — Log Reading Screen (clean-room re-plan)

> **Status:** Re-planned from scratch against `PRD.md` (v1.1, authoritative) and `CLAUDE.md`, independent of the first implementation attempt. This branch is `feat/session-3-log-reading-screen` (split off `feat/session-2-data-layer`).
>
> **For agentic workers:** implement task-by-task with `superpowers:executing-plans` or `superpowers:subagent-driven-development`. Steps use `- [ ]` for tracking. Follow the CLAUDE.md Definition of Done before committing.

## Goal

Ship the core **Log Reading screen** so a reading can be logged end to end and persists across restarts. Covers PRD **stories 1–5, 8** and the PRD sections **"Log Reading Screen"**, **"Input, Formatting & Locale Rules"**, and the save-time half of **"Target Ranges"**.

**Acceptance (from PLAN.md session 3):**
- Logging a reading with defaults takes **≤3 taps** (focus value → type → Save).
- The reading **persists across app restart**.
- All business logic runs **through domain use cases**; the screen holds none.
- `npx tsc --noEmit` and `npm test` pass; app boots to a reachable Log screen.
- Commit: `feat: log reading screen`.

## Non-goals (do not pull forward)

History list/detail/edit (Session 4), Trends (5), Settings screens & the standalone Target-Range editor & language switcher UI (6), Export (7), Onboarding (8), full accessibility/haptics audit + app icon (9). This session only builds the **Log form**, the **boot wiring** (migrations + settings init), and the **i18n strings** those need. The unit toggle on the form persists the preference (PRD allows it here), but there is no separate Settings unit screen yet.

---

## What Session 2 already provides (dependencies — do not reimplement)

| Concern | Symbol | Path |
| --- | --- | --- |
| Value parse + validate (20–600 mg/dL; mmol 1 decimal, `.`/`,`) | `validateReadingValue(raw, unit)` → `{ ok, mgdl, withinNormalRange } \| { ok:false, reason }` | `src/domain/use-cases/validate-reading-value.ts` |
| Range evaluation (Before→fasting, After→postMeal) | `evaluateReading(reading, ranges)` → `'in-range'\|'low'\|'high'` | `src/domain/use-cases/evaluate-reading.ts` |
| Persist a reading | `createReading(input, deps)` | `src/domain/use-cases/create-reading.ts` |
| Unit conversion | `mgdlToMmol`, `mmolToMgdl` | `src/domain/use-cases/convert-unit.ts` |
| Models | `Unit`, `MealType`, `MealTiming`, `Reading`, `TargetRange`, `AppSettings`, `DEFAULT_SETTINGS`, `Language`, `RangeEvaluation` | `src/domain/models/*` |
| SQLite adapters | `SqliteReadingRepository`, `SqliteSettingsRepository` | `src/data/repositories/*` |
| DB client / id | `db`, `generateId` | `src/data/db/client.ts`, `src/data/id.ts` |
| Migrations | `migrations` | `drizzle/migrations.js` |
| Theme tokens | `colors, spacing, radius, fontSize, fontWeight` | `src/ui/theme` |
| i18n instance | `i18n` (default export), `SUPPORTED_LANGUAGES` | `src/i18n` |

> ⚠️ **Runtime migrations are NOT run at boot yet** (`client.ts` only opens the db). Wiring `useMigrations` in `_layout.tsx` is a **Session 3 responsibility** — without it the app crashes on first query.

---

## Conventions this session MUST enforce (CLAUDE.md)

These are the rules the first attempt broke; the clean-room implementation must satisfy every one and the reviewer should check them explicitly:

1. **No hardcoded user-facing strings — ever.** Every string the user can see goes through i18n, *including*: the DB-boot-error text, the save-failure alert (`'Error' / 'Failed to save reading.'`), and the iOS picker **"Done"** button. Add a `common` namespace for generic labels (`ok`, `cancel`, `done`, `errorTitle`) reused across dialogs.
2. **Never `any`.** The Zustand `set` for a dynamic key uses a typed narrow, not `as any` (snippet in Task 2).
3. **Explicit return types** on every exported function (`getDefaultMealType`, `convertValueString`, `LogReadingForm`, `LogScreen`, store actions via the interface).
4. **No `enum`** — reuse the existing `as const` unions.
5. **Prefer `undefined` over `null`**; `hoursAfterMeal` only set when `mealTiming === 'After'`.
6. **Elderly-first UI:** base font ≥ 17, primary action a large full-width button (height ≥ 56), `allowFontScaling` stays on, smart defaults (time = now, mealType by time-of-day, mealTiming = Before). Layout must survive **1.3× font scale** (verify).
7. **Baseline accessibility:** `accessibilityRole` + i18n `accessibilityLabel` on every interactive element; `accessibilityState={{ selected }}` on toggle/chip. (Full VoiceOver audit is Session 9, but no interactive element ships label-less.)
8. **Files `kebab-case.ts`, components `PascalCase.tsx`, booleans `is/has/can`.**
9. **Domain purity:** the screen calls use cases only; any parsing/conversion/branching that isn't view state lives in a pure, testable function.

---

## Architecture

```
app/
  _layout.tsx              # MODIFY — run migrations, init settings (with error handling), sync i18n, gate render
  (tabs)/index.tsx         # MODIFY — thin route: SafeArea + KeyboardAvoiding + ScrollView → <LogReadingForm/>
src/
  ui/
    components/log-reading-form.tsx   # NEW — presentation + wiring to use cases
    hooks/use-settings.ts             # NEW — Zustand settings store (typed, no any)
    utils/log-form.ts                 # NEW — pure helpers: getDefaultMealType, convertValueString
  i18n/{vi,en}.json                   # MODIFY — common + logForm namespaces (both languages complete)
```

**Boot sequence** (`_layout.tsx`): `useMigrations` → on success call `initialize()` → on success sync `i18n.changeLanguage(preferredLanguage)` → render app. Show a spinner while `!isDbReady || !isInitialized`; show an **i18n'd error screen** if migrations OR init fail (init failure must be caught — see Task 3).

---

## Task 1 — Native date/time picker dependency

- [ ] Install: `npx expo install @react-native-community/datetimepicker`
- [ ] Confirm it lands in `package.json` and add `"@react-native-community/datetimepicker"` to the `plugins` array in `app.json`.
- [ ] `npx expo start` still bundles (config plugin resolves).

---

## Task 2 — Settings store (`src/ui/hooks/use-settings.ts`)

Zustand store holding `AppSettings` + init/update actions. **No `any`.**

- [ ] Define the store interface extending `AppSettings` with `isInitialized: boolean`, `initError?: string`, `initialize(): Promise<void>`, `updateSetting<K>(key, value): Promise<void>`.
- [ ] `initialize`: idempotent (`if (get().isInitialized) return`), read all six keys **in parallel** (`Promise.all`, not six sequential awaits), then `set({ ...values, isInitialized: true })`.
- [ ] `updateSetting`: persist via repo, then update state with a **typed narrow** — no `any`:

```ts
updateSetting: async (key, value) => {
  await settingsRepo.set(key, value);
  set({ [key]: value } as Pick<AppSettings, typeof key>);
  if (key === 'preferredLanguage') {
    void i18n.changeLanguage(value as Language); // typed cast within the guarded branch, not `any`
  }
},
```

- [ ] Error handling belongs to the **caller** (`_layout` wraps `initialize` in `.catch`). The store may also record `initError` for the boot screen to read. Do **not** silently swallow.

**Acceptance:** `tsc` clean with no `any`; `preferredLanguage` change flips `i18n` language.

---

## Task 3 — Boot wiring (`app/_layout.tsx`)

- [ ] `const { success: isDbReady, error: dbError } = useMigrations(db, migrations);`
- [ ] In `useEffect([isDbReady])`, when `isDbReady`, call `initialize().then(sync i18n).catch(...)`. **The `.catch` is mandatory** — an uncaught rejection (e.g. corrupt persisted JSON) otherwise leaves `isInitialized` false forever and the app hangs on the spinner. On catch, surface an error state (reuse the error screen).
- [ ] Render branches:
  - `dbError || initError` → error screen with i18n text `t('common.dbError', { message })` (fall back to `dbError.message`). Style from theme tokens, not inline hex.
  - `!isDbReady || !isInitialized` → centered `<ActivityIndicator size="large" color={colors.primary}/>` (no hardcoded hex).
  - else → the app stack.
- [ ] i18n is safe to call in every branch (it initializes synchronously with `lng: 'vi'` default).

**Acceptance:** cold start runs migrations once, lands on Log tab; simulated init failure shows the localized error screen, not an infinite spinner.

---

## Task 4 — i18n strings (`vi.json` + `en.json`)

Add two namespaces to **both** files, fully translated (no stray foreign words — the first draft had an Italian "comunque"; proofread the Vietnamese).

- [ ] `common`: `ok`, `cancel`, `done`, `errorTitle`, `dbError` (`"Lỗi cơ sở dữ liệu: {{message}}"`), `saveFailed` (`"Không thể lưu kết quả. Vui lòng thử lại."`).
- [ ] `logForm`: keep the existing key set (`valuePlaceholder`, `unitLabel`, `mealTypeLabel`, `mealTimingLabel`, `hoursAfterLabel`, `hoursSuffix`, `notesLabel`, `notesPlaceholder`, `recordedAtLabel`, `saveButton`, `saving`, `validation.*`, `alerts.*`, `mealTypes.*`, `mealTimings.*`) **plus** `a11y.*` labels for the value input, unit toggle, each meal chip, timing toggle, stepper +/−, date button, notes toggle, save button.
- [ ] `alerts` reworked for the save flow (see Task 6): `outOfBoundsTitle`, `outOfBoundsMessage`, `saveAnyway`; `savedTitle`, `savedMessage`; `rangeSavedLow`/`rangeSavedHigh` (combined "saved + out-of-range" messages, see design note in Task 6).

**Acceptance:** no `t()` key resolves to its raw key at runtime; `rg "'[A-Z].*'" src/ui` finds no user-facing string literals in components.

---

## Task 5 — Pure form helpers (`src/ui/utils/log-form.ts`) + tests

Extract branching logic out of the component so it is black-box testable (domain-purity spirit).

- [ ] `getDefaultMealType(date: Date): MealType` — `<11 Breakfast`, `<15 Lunch`, `<18 Snack`, else `Dinner`. Injectable date.
- [ ] `convertValueString(raw: string, from: Unit, to: Unit): string` — normalizes `,`→`.`, returns unchanged if empty/NaN or `from === to`, else converts via `mgdlToMmol`/`mmolToMgdl` and stringifies. This is exactly the unit-toggle round-trip logic.
- [ ] **Tests** (`__tests__/log-form.test.ts`, black-box):
  - `getDefaultMealType` boundaries: 10:59→Breakfast, 11:00→Lunch, 14:59→Lunch, 15:00→Snack, 17:59→Snack, 18:00→Dinner, 23:00→Dinner.
  - `convertValueString` round-trip: `"5.6"` mmol→mgdl→mmol stays `"5.6"` (PRD round-trip rule); `""`/`"abc"` pass through unchanged; comma input `"5,6"` handled.

**Acceptance:** new tests green; component imports these helpers rather than inlining the math.

---

## Task 6 — `LogReadingForm` (`src/ui/components/log-reading-form.tsx`)

Presentation + orchestration only. State: `valueStr`, `mealType`, `isMealTypeManual`, `mealTiming`, `hoursAfterMeal` (default 2), `notes`, `isNotesExpanded`, `recordedAt`, `inputError`, `isSaving`, picker state.

Layout per PRD "Log Reading Screen":
- [ ] **Value input** — dominant, large, centered. `keyboardType={preferredUnit === Unit.MmolL ? 'decimal-pad' : 'number-pad'}` (mg/dL must **not** offer a decimal key — the first attempt used `decimal-pad` for both, letting users type invalid decimals that only failed at Save). `maxLength={6}`.
- [ ] **Unit toggle** (mg/dL ↔ mmol/L): on change, rewrite `valueStr` via `convertValueString(...)` then `updateSetting('preferredUnit', next)`. Persists preference.
- [ ] **Meal type chips** (Breakfast/Lunch/Dinner/Snack): tapping sets `mealType` **and `isMealTypeManual = true`**.
- [ ] **Before/After toggle**; when After, show the **hours stepper (0–6)**, buttons disabled at bounds.
- [ ] **Date/time**: button shows a **locale-aware** formatted `recordedAt` — vi = `dd/MM/yyyy` + 24h, en = device locale default (use `toLocaleString`/`Intl` keyed on `preferredLanguage`; do **not** hardcode `MM/dd/yyyy`). Picker: iOS `datetime` in a modal (its confirm button uses `t('common.done')`), Android sequential date→time.
- [ ] **mealType auto-follow rule:** when `recordedAt` changes, re-derive `mealType` from the new time **only if `!isMealTypeManual`**. This preserves an explicit user choice instead of silently clobbering it when they adjust the time (the first attempt overwrote it).
- [ ] **Notes**: collapsed by default; expands to `multiline`, `maxLength={500}`, char counter.
- [ ] **Save button**: full-width, ≥56 tall, shows spinner + `t('logForm.saving')` while `isSaving`.
- [ ] **Baseline a11y** on every touchable (role + `accessibilityLabel` from `logForm.a11y.*`, `accessibilityState={{ selected }}` on chips/toggles).

### Save flow (Task 6, cont.) — two distinct out-of-range concepts, don't conflate

1. `validateReadingValue(valueStr, preferredUnit)`; on `!ok`, map `reason` → `t('logForm.validation.*')` inline under the input; return.
2. If `withinNormalRange === false` (value outside physical 20–600 bounds): warn-only confirm `Alert` (`outOfBoundsTitle`/`Message`, buttons Cancel + `saveAnyway`). Proceed only on confirm.
3. `createReading({ value: mgdl, mealType, mealTiming, hoursAfterMeal: mealTiming==='After' ? h : undefined, notes: notes.trim() || undefined, recordedAt: recordedAt.getTime() }, { repository: new SqliteReadingRepository(db), generateId, now: Date.now })`.
4. `evaluateReading(reading, { fasting: fastingRange, postMeal: postMealRange })`.
5. **Confirmation + range alert (design decision — one dialog):**
   - PRD story 8 wants a save confirmation; PRD story 34 wants an out-of-range alert on save. To honor both while staying elderly-first (max one dialog), show a **single** `Alert`:
     - in-range **or** `alertsEnabled === false` → `savedTitle`/`savedMessage`.
     - out-of-range **and** `alertsEnabled` → `savedTitle` + `rangeSavedLow`/`rangeSavedHigh` (e.g. *"Đã lưu. Đường huyết của bạn đang THẤP (60 mg/dL)."*) — the message both confirms the save and warns.
   - Alert value shown in `preferredUnit` (`mgdlToMmol` when mmol/L).
   - `onPress` of the OK button → `resetForm()`.
6. On thrown error: `console.error` + `Alert(t('common.errorTitle'), t('common.saveFailed'))`. **No English literals.**

`resetForm`: clear value/notes, collapse notes, `recordedAt = now`, `mealType = getDefaultMealType(now)`, `isMealTypeManual = false`, `mealTiming = Before`, `hoursAfterMeal = 2`, clear `inputError`.

**Acceptance:** save persists (verify via restart); the three flows (in-range, out-of-range+alerts, out-of-bounds warn) behave per PRD; no business logic in the component beyond wiring.

---

## Task 7 — Log route (`app/(tabs)/index.tsx`)

- [ ] Thin route: `SafeAreaView` → `KeyboardAvoidingView` (`padding` iOS / `height` Android) → `ScrollView keyboardShouldPersistTaps="handled"` → `<LogReadingForm/>`. Background from `colors.background`. Explicit `ReactElement` return type.

---

## Task 8 — Verification (Definition of Done)

- [ ] `npx tsc --noEmit` clean (strict, `noUncheckedIndexedAccess`, no `any`).
- [ ] `npm test` green (session-2 suites + new `log-form.test.ts` + `use-settings.test.ts`).
- [ ] Manual, on device/simulator:
  - **≤3 taps** with defaults: focus value → type `95` → Save → confirmation → form reset.
  - Kill and relaunch → the reading is still stored (DB persistence + migrations ran).
  - Unit toggle round-trip: type `5.6` mmol/L → switch mg/dL (`101`) → switch back (`5.6`).
  - Validation: empty / letters / `95.5` in mg/dL (integer error) / `5.45` in mmol/L (precision error) each show the localized inline error.
  - Out-of-bounds `10` → warn confirm; Cancel keeps form, Save Anyway saves.
  - Target-range: with fasting 70–100, log `120` Before → HIGH alert; `60` → LOW; `85` → plain saved confirmation; toggle alerts off → no range alert, still confirms.
  - Manually pick "Snack", then change the time to 20:00 → mealType **stays Snack** (not reset to Dinner).
  - Switch device/app language → all form strings, alerts, and the picker "Done" button localize; no raw keys, no English leaking in vi.
  - 1.3× system font scale → no clipped text / broken layout on the form.
- [ ] Commit `feat: log reading screen` (tree builds first).

---

## Gaps this clean-room plan closes vs. the first attempt

| # | Issue in first attempt | Fixed by |
| --- | --- | --- |
| 1 | Hardcoded `'Error'`/`'Failed to save reading.'`, iOS picker `Done`, `Database Error:` (violates i18n rule) | Task 4 `common` namespace; Tasks 3 & 6 use `t()` |
| 2 | `set({ [key]: value } as any)` (violates "Never `any`") | Task 2 typed `Pick` narrow |
| 3 | Editing date/time silently overwrote a manually chosen meal type | Task 6 `isMealTypeManual` guard |
| 4 | `initialize()` had no `.catch` → possible infinite spinner | Task 3 mandatory `.catch` + error screen |
| 5 | `decimal-pad` for mg/dL let users type invalid decimals | Task 6 keyboard keyed on unit |
| 6 | Interactive elements had no a11y labels | Task 6 baseline a11y + `logForm.a11y.*` |
| 7 | Smart-default / toggle math inlined, untested | Task 5 pure helpers + tests |
| 8 | English date format hardcoded `MM/dd/yyyy` | Task 6 locale-aware formatting |
| 9 | 6 sequential setting reads at boot | Task 2 `Promise.all` |
| — | Italian "Lưu comunque" string in the old plan | Task 4 proofread (code already shipped "Vẫn lưu") |
