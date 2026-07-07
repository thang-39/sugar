# PLAN addition — GDM pivot (Sessions 10–14)

Reconciled against repo state 2026-07-06: Sessions 1–9 + 4.5 done; **old Session 10 (build + store prep) not started → renumbered to Session 14** so the store listing ships once, with GDM positioning, and with the PDF report already in the build (it's the promise in the launch post).

Paste the session blocks below into `PLAN.md` after Session 9. Paste the PRD amendment block into `PRD.md`'s changelog. Growth-plan mapping at the bottom.

**Architecture principle for all sessions below (mode switch):**
*Mode = preset over configuration, not a code fork.* `conditionType` selects a preset that **initializes** settings (target ranges, log-form defaults, report template); every downstream feature keeps reading plain settings values. `readings` is condition-agnostic and needs **zero schema changes** — the GDM "fasting" slot is simply `mealTiming='Before' + mealType='Breakfast'`, and after-meal slots are `mealTiming='After' + mealType + hoursAfterMeal`. The 4-slot day view is a *projection* over existing rows. Switching modes re-applies a preset (with confirmation) and never touches records. Legitimate mode branches exist in exactly four places — onboarding steps, home screen layout, report template, postpartum lifecycle — all resolved through one `CONDITION_PRESETS` map + `useConditionProfile()` hook, never scattered `if (isGdm)` checks.

---

### Session 10: GDM mode — condition presets + onboarding v2 (PRD v1.3 stories 56–57)
**Goal:** the app understands *who* it's tracking for, as configuration — no readings migration.

- Domain (`src/domain/models/condition.ts`), per CLAUDE.md `as const` convention:
  ```ts
  export const ConditionType = { Gestational: 'gestational', Type2: 'type2', General: 'general' } as const;
  export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];
  ```
- `CONDITION_PRESETS` map → default ranges in canonical mg/dL: gestational fasting **70–95** (3.9–5.3 mmol/L), after-meal **70–140** when `gdmTiming=1` (7.8) or **70–120** when `gdmTiming=2` (6.7); type2 keeps current defaults (70–100 / 70–140); general = current defaults. Presets **initialize** `fastingRange`/`postMealRange` — they are not a second source of truth; user edits in Settings win.
- New `SettingsRepository` typed keys (JSON kv table → no migration): `conditionType` (default `'general'`), `dueDate` (unix, nullable), `gdmTiming` (`1 | 2`). Existing installs silently stay `'general'`.
- Domain helpers + tests: `pregnancyWeek(dueDate, now)` (clamp 1–42, device tz); `getDaySlots(readings, date, gdmTiming)` → 4 slots `fasting | afterBreakfast | afterLunch | afterDinner`, each `{ status: 'done' | 'pending', reading? }`, picking the reading matching `gdmTiming` when duplicates exist (fallback: latest); Snack/other readings returned in an `extras` array, never dropped.
- Onboarding v2 (extends Session 8's single screen into steps): step 1 = existing language/unit/disclaimer → step 2 = "Bạn đang theo dõi đường huyết cho…" (3 large option cards) → step 3 (gestational only) = due date + "Bác sĩ dặn đo sau ăn 1 giờ hay 2 giờ?" segmented → applies preset. Skip anywhere → `'general'` + current defaults, unchanged behavior.
- Settings root: new "Chế độ theo dõi" row → change condition with confirm dialog ("Ngưỡng mặc định sẽ được cập nhật theo chế độ mới — dữ liệu đã ghi giữ nguyên"). Re-applies preset over ranges only.
- All new strings via i18n (vi + en).

**Accept:** fresh install → GDM path prefills ranges per timing choice; skip path byte-identical to today's behavior; `drizzle` folder has no new migration; `getDaySlots` tests cover duplicates-per-slot, Snack exclusion→extras, day boundary in device tz. Commit: `feat: gdm mode — condition presets, onboarding v2`

---

### Session 11: "Hôm nay" — GDM home screen (story 58)
**Goal:** GDM users open the app to today's rhythm, not a blank form.

- When `conditionType === 'gestational'`, the Log tab (`app/(tabs)/index.tsx`) renders `TodayScreen`; other modes keep the current Log form untouched.
- Header: `Tuần {pregnancyWeek}` + due-date countdown (AppText + existing ScreenHeader).
- The 4-slot day organizer via `getDaySlots`: done → value in preferred unit + in/low/high status tint (existing status tokens); pending before its expected time (from Session 12's meal-time settings; until then, fixed defaults 07:00/08:30/13:30/19:30) → time chip + "Ghi ngay"; pending past expected time → muted + "+ Thêm". Extras row lists Snack readings.
- Tap a slot → push the **existing** Log form prefilled (`mealType`, `mealTiming`, `hoursAfterMeal = gdmTiming`, `recordedAt = now`) via router params — reuse the Session 3 form component; zero duplicated form logic.
- Secondary link under the organizer: "Xuất báo cáo cho bác sĩ" (routes to Session 13 screen; placeholder until then).
- New composite `SlotCard` built strictly on primitives (`Card`, `AppText`, `Badge`, `Button`); colors/spacing from theme only.

**Accept:** logging via a slot = tap slot → type value → Save (≤3 taps incl. slot tap); slot statuses roll over correctly at midnight device tz; `general`/`type2` modes render the unchanged Log form; `tsc` + tests green. Commit: `feat: today screen for gdm mode`

---

### Session 12: Meal-anchored reminders — local notifications (story 59)
**Goal:** the #1 reason the app gets opened. **Local scheduled notifications via `expo-notifications` — this does NOT un-defer the PRD's "push notifications (FCM/APNs)" item; no server, no tokens.**

- Settings → "Nhắc đo đường huyết": wake time + 3 meal times, per-slot on/off toggles. Stored as settings keys (`mealTimes`, `reminderPrefs`).
- Scheduling: fasting reminder at wake time; each enabled meal slot at mealTime + `gdmTiming` hours. On any change: cancel-all-scheduled → rebuild (idempotent; use stable notification identifiers per slot).
- Notification tap → deep link (expo-router) to Log form prefilled for that slot, same params contract as Session 11.
- Permission flow: request on first enable, graceful denied state with link to OS settings; reminders master toggle off by default for non-GDM, on-by-suggestion at end of GDM onboarding ("Bật nhắc đo?" — one tap, skippable).
- Copy is caring, not clinical: "Đến giờ đo sau ăn trưa rồi mẹ ơi 🌿" (final strings via i18n, vi + en).

**Accept:** reminders fire with the app killed (physical device check); editing a meal time reschedules exactly one notification per slot (assert via `getAllScheduledNotificationsAsync` in a dev screen or log); disabling a slot cancels only that slot; denied-permission state renders and recovers. Commit: `feat: meal-anchored local reminders`

---

### Session 13: Doctor report PDF (un-defers story 42) ⭐ the value moment
**Goal:** replace the paper sheet the hospital hands out — the reason this app exists and the promise of the launch post.

- Domain `ReportService` (pure, tested): input readings + date range + targets + `gdmTiming` → report model: rows = days, columns = [Đói | Sau ăn sáng | Sau ăn trưa | Sau ăn tối] via `getDaySlots`; per-cell out-of-range flag; footer stats (% in-range, total readings); header fields (pregnancy week at export, range, active thresholds + timing, unit).
- Render: HTML template → `expo-print` `printToFileAsync` (A4) → `expo-sharing`. Vietnamese renders via system fonts in the WebView; verify diacritics on both platforms (embed base64 Nunito only if a device renders wrong). Target: 14 days per A4 page.
- Layout deliberately echoes the hospital's ruled paper form — the doctor should recognize it instantly. Out-of-range cells tinted `#FDECE4` with `#B23C10` text (print-safe, still readable in grayscale via bold).
- Entry points: Today header button + Settings → Export (tab/toggle: CSV | PDF, CSV spec untouched).
- Footer watermark "Tạo bởi app Sugar" + increment a `reportCount` settings key on each successful export (silent for now — the paywall session gates on it later; do NOT build any gating in this session).
- vi + en template strings via i18n.

**Accept:** ReportService unit tests green (cell mapping, duplicates, Snack excluded from grid, stats math); generated PDF opens correctly in Zalo and iOS Files with intact diacritics; 14 days fits one page; CSV export unchanged. Commit: `feat: doctor report pdf`

---

### Session 14 (was Session 10): Build + store prep — GDM positioning
Everything from the original Session 10 block (EAS config, bundle IDs, permissions audit — now includes the notifications permission from Session 12 — privacy policy page + real URL in About, compliance checklists), with the listing upgraded to GDM positioning:

- **Title (Play, ≤30 chars):** `Sugar – Sổ tiểu đường thai kỳ`
- **Short description (≤80):** `Ghi đường huyết 2 chạm, nhắc đo sau bữa ăn, xuất báo cáo đưa bác sĩ`
- Keywords (iOS field / woven into Play description): tiểu đường thai kỳ, đường huyết, mẹ bầu, GDM, sổ theo dõi đường huyết, đo đường huyết, glucose, thai kỳ
- 6 screenshots (vi, per growth plan §3): report "Thay tờ giấy bệnh viện phát" / log "Ghi xong trong 5 giây" / reminder / Hôm nay slots / trends / share-to-Zalo
- Description phrasing stays "log and track" — no diagnose/treat/manage claims (unchanged compliance rule). Data Safety remains "no data collected" (still local-only; notifications are local).

**Accept:** original Session 10 criteria + vi listing assets ready. Commit: `chore: eas build config and store assets`

---

## PRD amendment — paste into PRD.md changelog

### v1.3 (2026-07-06)
- **Positioning: gestational diabetes (GDM) is the primary acquisition persona.** Vietnamese pregnant women diagnosed via OGTT at week 24–28, measuring 4×/day for 12–16 weeks, exporting a report for prenatal visits every 2–4 weeks. The elderly/type-2 persona and all its UI rules remain in full (elderly-first constraints are unchanged and benefit GDM users too).
- **New section: Condition profile & presets.** `conditionType` (`gestational | type2 | general`) + `dueDate` + `gdmTiming` stored as `app_settings` keys (no migration). Presets initialize — never own — target ranges. `readings` schema explicitly unchanged; GDM day slots are a projection (`Before+Breakfast` = fasting; `After+mealType(+hoursAfterMeal)` = post-meal slots).
- **Story 42 (PDF report) un-deferred** — spec in Session 13. CSV spec unchanged.
- **Local scheduled reminders in scope** (expo-notifications). The deferred item is narrowed to *server push (FCM/APNs)*, which stays deferred.
- **New stories 56–60:** 56 condition select in onboarding · 57 GDM targets prefilled by doctor's 1h/2h instruction · 58 "Hôm nay" 4-slot home for GDM mode · 59 meal-anchored reminders · 60 doctor report PDF.
- Store listing updated to GDM positioning (Session 14). Monetization (one-time Pro), Supabase auth + cloud backup, ads/affiliate remain deferred — sequenced in `SUGAR-GROWTH-PLAN.md`.

---

## Mapping to SUGAR-GROWTH-PLAN.md numbering

| Growth plan | This repo | Note |
|---|---|---|
| S10 GDM profile | **Session 10** | + onboarding v2 merged in |
| S11 Reminders | **Session 12** | Today screen inserted before it |
| S12 PDF report | **Session 13** | before store launch, deliberately |
| S18 ASO | **Session 14** | merged into store prep |
| S13–S17 (paywall, gating, auth, backup, ads) | **Sessions 15–19** | after soft launch in mom groups |
| S19–S21 (launch loop, postpartum+affiliate, polish) | **Sessions 20–22** | per growth plan |
