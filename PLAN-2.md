# PLAN 2 — GDM pivot, Monetization & Growth (Sessions 10–23)

**Supersedes** `PLAN-ADDITION-gdm-sessions.md` and `PLAN-ADDITION-monetization-sessions.md` (strategy context stays in `SUGAR-GROWTH-PLAN.md`). `PLAN.md` (Sessions 1–9 + 4.5) is untouched; its old Session 10 (store prep) lives here as Session 14.

Written 2026-07-11 against repo state: Sessions 1–9 + 4.5 done. Same working rules as PLAN.md: one session per conversation, read `CLAUDE.md` + the session block first, Definition of Done applies, no pulling work from future sessions.

**Design references:** `design/Sugar App.dc.html` (current app, source of truth for existing screens) + `design/Sugar App.dc-merge.html` (GDM merge draft — **NOT authoritative yet**; must be revised per the reconciliation checklist below before Session 10 UI work).

---

## Decisions locked 2026-07-11 (review of dc-merge design)

1. **Two tracking modes, not three.** `ConditionType = { Gestational: 'gestational', General: 'general' }`. "Type 2 diabetes" removed — it had identical presets/behavior to General and no distinct features; General ("Theo dõi thường ngày / Daily tracking") is the safe default, the Skip path, and covers type 1/2/prediabetes without self-diagnosis. Re-add a type-2 mode only when it gets real features (e.g. family view). Settings → Tracking mode shows 2 options.
2. **Onboarding order:** welcome (existing Session 8 screen: tagline, unit, language, disclaimer) → condition select (2 cards + Skip) → GDM detail (gestational only). The merge design's welcome step exists but is disconnected — must become step 1 again.
3. **After-meal protocol supports the "both targets" reality.** Doctors commonly give targets for both 1h (<7.8 mmol/L / 140) and 2h (<6.7 / 120), with the workflow: measure at 1h → in range = done; out of range = re-check at 2h. So the onboarding question becomes *"When does your doctor ask you to measure after meals?"* with 3 options: `1h` / `2h` / `1h + re-check at 2h`. Stored as `afterMealProtocol: '1h' | '2h' | '1h+2h'` (replaces the old `gdmTiming: 1|2`). GDM preset always initializes **both** after-meal ranges; the protocol drives reminders, log-form prefill, slot/report projection.
4. **Target ranges:** keep the existing 2-card screen for General. GDM mode shows 3 cards: Fasting (70–95), After meal 1h (70–140), After meal 2h (70–120). New optional settings key `postMeal2hRange`; existing `postMealRange` stays the 1h/primary range. `evaluateReading`: `hoursAfterMeal >= 2` and `postMeal2hRange` set → use 2h range, else `postMealRange`. General mode behavior unchanged.
5. **Reminders = manual list + smart after-meal.** Replace the merge design's fixed 4-slot list with: (a) manual reminders the user adds/edits/deletes (time + label + on/off); (b) a smart after-meal reminder: master toggle + offset choice (1h / 2h / both), anchored on *saved before-meal readings*, not fixed meal times. With protocol `1h+2h`: if the 1h after-meal reading is out of range, schedule one more re-check reminder at +1h.
6. **Today tab for ALL modes.** Header differs (GDM: pregnancy week + due countdown; General: today's date only). Slots are **derived from the user's reminder configuration**, not hardcoded to 4 — GDM preset initializes the classic 4 (fasting + after 3 meals), but a user measuring 6–7×/day (before+after each meal, bedtime) sees a slot per enabled reminder. One component for both modes.
7. **Theme per mode.** Mode selects a theme preset via `CONDITION_PRESETS`: General = Evergreen green (current), Gestational = pink/rose. Only `primary`/accent-level tokens swap; layout, spacing, typography identical. ⚠️ The pink palette does not exist in any design file yet — define it in Claude Design first (reconciliation checklist).
8. **One export surface.** Doctor report screen (PDF) absorbs CSV export ("Share PDF" + "Export CSV" buttons, as the merge design already drew). Settings → "Export data" row and the standalone Export screen are **removed**. Session 7's CSV code is reused as-is behind the new button; the locked CSV spec is unchanged.
9. **Deferred, explicitly:** meal-content logging + meal photo AI analysis (user idea 2026-07-11 — fits growth plan §11 "food database" deferral); type-2 mode revival; everything already deferred in PRD/growth plan.

**Architecture principle (unchanged from the GDM addition):** *Mode = preset over configuration, not a code fork.* `conditionType` selects a preset that **initializes** settings (target ranges, theme, reminder defaults, log-form defaults, report template); downstream features read plain settings. `readings` needs **zero schema changes** — fasting = `Before+Breakfast`; after-meal slots = `After+mealType(+hoursAfterMeal)`. Slots/report are projections over existing rows. Mode switch re-applies a preset (with confirmation), never touches records. Mode branches live in exactly four places — onboarding steps, Today header, report template, postpartum lifecycle — via one `CONDITION_PRESETS` map + `useConditionProfile()` hook, never scattered `if (isGdm)`.

---

## Design reconciliation checklist (do in Claude Design BEFORE Session 10 UI, export over `Sugar App.dc.html`)

- [ ] Welcome screen restored as onboarding step 1 (condition select becomes step 2)
- [ ] Condition select: remove "Type 2 diabetes" card; relabel "General tracking only" → "Daily tracking / Theo dõi thường ngày"
- [ ] GDM detail step: after-meal question gets 3rd option "1 hour, re-check at 2 hours"; preview line shows both targets when applicable; due-date field label is **"Expected delivery date"** (not "Due date")
- [ ] Define the **pink/rose GDM theme palette** (primary, surface, bg tints) alongside Evergreen
- [ ] Today tab: variant for General mode (date header, no week/countdown); slots rendered from a list (not fixed 4); **"Add a reminder" button present on all 3 Today variants** (pregnant, postpartum, general)
- [ ] Reminders screen: **available for all modes** (not GDM-only); manual reminder list with "+ Add reminder" (time + label + name) + smart after-meal section (toggle + 1h/2h/both); **tapping a reminder row opens the edit sheet**; delete is inside the edit sheet (not an inline X button)
- [ ] Reminder editor sheet: has **Reminder name** field + **Time** field prominently; Repeat toggle (Every day / One time only); one-time date picker label adapts: "Specific date" (general), "Special pregnancy date" (gestational pregnant), "Postpartum date" (postpartum)
- [ ] Postpartum Today header: title is **"After delivery"** (not "Week 40"); subtitle says "Expected date {date} has passed" (not "Due date")
- [ ] Target Ranges: third card "After meal (2h)" shown in GDM mode
- [ ] Settings: remove "Export data" row; "Doctor report (PDF)" row present for all modes; keep Tracking mode row (2 options); **Measurement reminders row is shown for all modes** (not GDM-only)
- [ ] Doctor report screen: keep both Share PDF + Export CSV buttons (already drawn)

Per CLAUDE.md: never guess token values — reconcile `src/ui/theme` against the exported design file.

---

### Session 10: Condition presets + onboarding v2 + per-mode theme (PRD v1.3 stories 56–57)
**Goal:** the app understands *who* it's tracking for, as configuration — no readings migration.

- Domain `src/domain/models/condition.ts` (per CLAUDE.md `as const` convention):
  ```ts
  export const ConditionType = { Gestational: 'gestational', General: 'general' } as const;
  export type ConditionType = (typeof ConditionType)[keyof typeof ConditionType];
  export const AfterMealProtocol = { OneHour: '1h', TwoHours: '2h', OneThenTwo: '1h+2h' } as const;
  ```
- `CONDITION_PRESETS` map (canonical mg/dL): gestational → fasting **70–95**, postMeal (1h) **70–140**, postMeal2h **70–120**, theme `rose`; general → current defaults 70–100 / 70–140, no 2h range, theme `evergreen`. Presets **initialize** settings — user edits in Settings win; never a second source of truth.
- New `SettingsRepository` typed keys (JSON kv → no migration): `conditionType` (default `'general'`), `dueDate` (unix, nullable), `afterMealProtocol` (`'1h' | '2h' | '1h+2h'`, default `'1h'`), `postMeal2hRange` (nullable). Existing installs silently stay `'general'`.
- `evaluateReading` extension: reading with `mealTiming='After'` and `hoursAfterMeal >= 2` uses `postMeal2hRange` when set, else `postMealRange`. Unit-tested; General-mode behavior byte-identical to today.
- Domain helpers + tests: `pregnancyWeek(dueDate, now)` (clamp 1–42, device tz); `getDaySlots(readings, date, slotDefs)` → slot list (`{ status: 'done'|'pending', reading?, followUp? }`), duplicate handling (prefer reading matching protocol timing, fallback latest), Snack/others → `extras`, never dropped. `slotDefs` is an input (Session 11 derives it from reminders; default = classic 4).
- **Theme presets:** `src/ui/theme` exposes named token sets (`evergreen`, `rose`); a theme provider/hook selects by `conditionType`. Only primary/accent-level tokens differ. Values reconciled against the updated design file — no guessed hex.
- Onboarding v2 (extends Session 8's screen into steps): step 1 = existing welcome (unit/language/disclaimer) → step 2 = "Bạn đang theo dõi đường huyết cho…" (2 large option cards) → step 3 (gestational only) = due date + "Bác sĩ dặn đo sau ăn khi nào?" (1 giờ / 2 giờ / 1 giờ, đo lại lúc 2 giờ nếu cao) + targets preview → applies preset. Skip anywhere → `'general'`, behavior unchanged from today.
- Settings root: "Chế độ theo dõi" row (2 options) → confirm dialog ("Ngưỡng mặc định và giao diện sẽ đổi theo chế độ mới — dữ liệu đã ghi giữ nguyên"), re-applies preset over ranges + theme only.
- All strings i18n (vi + en).

**Accept:** fresh install → GDM path prefills fasting + both after-meal ranges per protocol and app renders rose theme; skip path identical to today (green, same defaults); no new drizzle migration; `getDaySlots`/`evaluateReading`/`pregnancyWeek` tests cover duplicates, Snack→extras, 2h-range fallback, day boundary in device tz. Commit: `feat: condition presets, onboarding v2, per-mode theme`

---

### Session 11: Reminders — manual list + smart after-meal (story 59)
**Goal:** the #1 reason the app gets opened. **Local notifications via `expo-notifications`** — this does NOT un-defer server push (FCM/APNs); no server, no tokens.

- Settings → "Nhắc đo đường huyết" (all modes — shown in Settings for every user, not just GDM):
  - **Manual reminders:** list with add/edit/delete — each `{ id, time, label, enabled }` (settings key `manualReminders`). **Tapping a reminder row opens the edit sheet** (not just toggle). GDM preset seeds one "Đo lúc đói" reminder at 06:30 (editable/deletable like any other); General seeds none.
  - **Edit sheet (bottom sheet):** fields are **Reminder name** + **Time** (prominent `<input type="time">`) + Repeat toggle (`Every day` / `One time only`). When "One time only" is selected, a date picker appears with a context-aware label: `Specific date` (general), `Special pregnancy date` (gestational pregnant), `Postpartum date` (postpartum). Delete button inside the sheet (no inline X on list row).
  - **Smart after-meal reminder:** master toggle + offset segmented `1h / 2h / 1h & 2h` (settings key `smartAfterMeal`, default offset from `afterMealProtocol`). Helper copy explains the anchor: "Khi mẹ ghi chỉ số *trước ăn*, Sugar sẽ tự nhắc đo lại sau bữa."
- **Today tab — "Add a reminder" button present on all 3 variants** (pregnant GDM, postpartum, general daily). Routes to reminders screen with new-reminder sheet open.
- Scheduling logic (data layer service, domain-computed schedule is pure + tested):
  - Manual: repeating daily notifications, stable identifier per reminder id; any change → cancel that id → reschedule (idempotent).
  - Smart: on save of a `Before`-meal reading → schedule one-shot notification(s) at `recordedAt + offset(s)`, identifier keyed by reading id (re-save/edit replaces; delete cancels).
  - Protocol `1h+2h` conditional re-check: on save of an `After`-meal reading with `hoursAfterMeal=1` that is **out of range** → schedule one-shot "đo lại lúc 2 giờ" at `recordedAt + 1h`. In-range → nothing.
- Notification tap → deep link (expo-router) to Log form prefilled (`mealType`, `mealTiming='After'`, `hoursAfterMeal` per offset, `recordedAt=now`) — params contract reused by Session 12.
- Permission flow: request on first enable; graceful denied state with link to OS settings. GDM onboarding ends with one-tap "Bật nhắc đo?" suggestion (skippable); everything default-off for General.
- Copy caring, not clinical: "Đến giờ đo sau ăn trưa rồi mẹ ơi 🌿" (i18n vi + en).

**Accept:** reminders fire with app killed (physical device); before-meal save schedules exactly the configured one-shots (assert via `getAllScheduledNotificationsAsync` in a dev/debug screen); out-of-range 1h reading under `1h+2h` protocol schedules the re-check, in-range does not; editing/deleting a manual reminder touches only its identifier; denied-permission state renders and recovers; `tsc` + tests green (schedule computation pure-tested). Commit: `feat: manual and smart meal-anchored reminders`

---

### Session 12: "Hôm nay" — Today tab for all modes (story 58)
**Goal:** open the app to today's rhythm, not a blank form — for every user.

- New Today tab (first tab) for **both modes**; Log tab keeps the current form untouched.
- Header: gestational → `Tuần {pregnancyWeek}` + due-date countdown; general → today's date (localized), nothing pregnancy-related.
- **Slots derived from reminder config:** `buildSlotDefs(manualReminders, smartAfterMeal, afterMealProtocol)` (pure, tested) → e.g. classic 4 for the GDM preset, more for users with extra reminders (before-meal, bedtime…), sensible default set when no reminders configured. Rendered via Session 10's `getDaySlots`.
- Slot states: done → value in preferred unit + in/low/high tint (existing status tokens); pending before its expected time → time chip + "Ghi ngay"; pending past time → muted "+ Thêm" (no guilt copy — anti-pattern rule §8). Extras row lists Snack/unmatched readings. `1h+2h` follow-up shown inside the slot ("đo lại 2h: 6.5 ✓").
- Tap slot → push the **existing** Log form prefilled via router params (same contract as Session 11 deep links) — zero duplicated form logic.
- Secondary link: "Xuất báo cáo cho bác sĩ" (routes to Session 13 screen; placeholder until then).
- New composite `SlotCard` strictly on primitives (`Card`, `AppText`, `Badge`, `Button`); colors from theme tokens only (renders correctly under both `evergreen` and `rose`).

**Accept:** log via slot = tap → value → Save (≤3 taps); slots roll over at midnight device tz; general mode shows date header + slots from its reminders with green theme; GDM shows week header + rose theme; `buildSlotDefs` tests green; `tsc` + tests green. Commit: `feat: today tab for all modes`

---

### Session 13: Doctor report PDF + unified export ⭐ (un-defers story 42)
**Goal:** replace the paper sheet the hospital hands out — the value moment and the launch-post promise.

- Domain `ReportService` (pure, tested): readings + date range + targets + protocol → report model: rows = days, columns = [Đói | Sau ăn sáng | Sau ăn trưa | Sau ăn tối] via `getDaySlots`; under `1h+2h`, a cell with a re-check renders both ("7.9 → 6.5") and takes its status from the protocol rule (1h in range = good; else judge the 2h value); per-cell out-of-range flag; footer stats (% in-range, total readings); header (pregnancy week at export when GDM, date range, active thresholds + protocol, unit).
- Render: HTML template → `expo-print` `printToFileAsync` (A4) → `expo-sharing`. Verify Vietnamese diacritics on both platforms (embed base64 Nunito only if a device renders wrong). 14 days per A4 page. Layout echoes the hospital's ruled form. Out-of-range cells `#FDECE4` bg + `#B23C10` text (grayscale-safe via bold).
- **Unified export surface:** this screen carries both **"Share PDF"** and **"Export CSV"** (+ shared time-range picker). CSV button calls Session 7's ExportService unchanged (locked spec). Remove Settings → "Export data" row and the old standalone Export screen route; Settings row becomes "Doctor report / Xuất dữ liệu". Entry points: Settings row + Today link (both modes — General gets the same grid without the pregnancy header).
- Footer watermark "Tạo bởi app Sugar" + increment `reportCount` settings key per successful PDF export (silent — Session 16 gates on it; build NO gating now).
- vi + en template strings via i18n.

**Accept:** ReportService tests green (cell mapping, duplicates, re-check rendering + status rule, Snack excluded from grid, stats math); PDF opens correctly in Zalo and iOS Files with intact diacritics; 14 days fit one page; CSV output byte-identical to Session 7 spec; old export route gone, no dead i18n keys. Commit: `feat: doctor report pdf and unified export`

---

### Session 14: Build config + store prep assets — GDM positioning (was PLAN.md Session 10)
**Strategy note (updated 2026-07-12):** actual store **submission is deferred to the final Session 23** (publish Google + Apple together). This session only lays the technical rails + prepares assets — no publishing. Rationale: build the full app (through Session 22) first, then launch once. Trade-off consciously accepted: **no early soft-launch feedback loop** (the growth plan's §7 soft launch / internal-testing cohort now happens at Session 23, not here).

Everything from the original Session 10 block (EAS config, bundle IDs, permissions audit — now includes notifications from Session 11 — privacy policy page + real URL in About, compliance checklists), with GDM listing:

- **Title (Play, ≤30 chars):** `Sugar – Sổ tiểu đường thai kỳ`
- **Short description (≤80):** `Ghi đường huyết 2 chạm, nhắc đo sau bữa ăn, xuất báo cáo đưa bác sĩ`
- Keywords: tiểu đường thai kỳ, đường huyết, mẹ bầu, GDM, sổ theo dõi đường huyết, đo đường huyết, glucose, thai kỳ
- 6 screenshots (vi, growth plan §3): report "Thay tờ giấy bệnh viện phát" / log "Ghi xong trong 5 giây" / reminder / Hôm nay slots (rose theme) / trends / share-to-Zalo
- Description stays "log and track" — no diagnose/treat/manage claims. Data Safety remains "no data collected" (local-only; notifications are local).

**Accept:** original Session 10 criteria (installable EAS build on a real device) + vi listing assets ready. **No store submission this session.** Commit: `chore: eas build config and store assets`

→ After this session: continue building (Sessions 15–22). **Do NOT submit to stores yet** — that is Session 23. The Admin track below (Play merchant profile, RevenueCat) is worth starting in parallel, but it **no longer blocks Session 15** — Session 15 was re-scoped to a dev adapter (2026-07-12). RevenueCat wiring + accounts are now part of Session 23.

---

### Session 15: IAP rails + Paywall — dev adapter (growth plan S13)
**Split from RevenueCat wiring (decided 2026-07-12):** Play account verification was blocking, so Session 15 builds the entire entitlement + paywall surface against a **dev adapter** — no Play/RevenueCat accounts, no EAS build, runs in Expo Go. The real `react-native-purchases` adapter is a drop-in behind the factory seam and is wired at the end (**→ Session 23 "RevenueCat wiring"**). Nothing here changes when it lands. **DONE 2026-07-12** (branch `feature/session-15-`, `tsc`/tests/lint green).

- No account prereq. Price always from `product.priceString` — never hardcoded. **No fake "199k gạch ngang" anchor** — "Giá ra mắt" copy instead (store-policy + advertising-law risk).
- **Layering + the seam:** port `EntitlementRepository` in `src/domain/repositories/` (`isPro/purchasePro/restore/getProProduct`); `DevEntitlementRepository` in `src/data/` (module-level `devIsPro`, always-succeeds purchase) is the current adapter; `getEntitlementRepository()` in `factory.ts` is **the one place** the RevenueCat adapter swaps in (Session 23). `useIsPro()` / `useEntitlementStore` (zustand cache, refresh on boot + AppState foreground + after purchase/restore).
- Paywall `app/paywall.tsx` (modal): Free/Pro comparison from `PRO_BENEFITS` config; CTA "Mở khóa Sugar Pro — {priceString}"; "Khôi phục giao dịch"; loading/pending/cancelled/error/success + already-Pro states. Route param `paywallSource` (`report_gate | csv_gate | charts_gate | backup_gate | settings`) → contextual copy / counters. *Note: `PRO_BENEFITS` currently pre-lists the 5 committed benefits (ship in S16/S18) so the build-ahead paywall shows value — mild stretch of money-principle #3; tighten if desired.*
- **Aptabase analytics (recommended, removable):** exactly 6 anonymous events, never a glucose value: `onboarding_completed {mode}` · `first_reading_logged` · `report_exported {count}` · `paywall_viewed {source}` · `purchase_completed` · `backup_enabled`; thin `src/data/analytics.ts` wrapper (Aptabase send deferred = dev-log no-op) + `analyticsEnabled` opt-out setting. Paywall wires `paywall_viewed` + `purchase_completed`; other events wired by their owning sessions.
- Settings row "Sugar Pro" (→ paywall; "Đã mở khóa ✓" when Pro) + analytics opt-out toggle + `__DEV__`-only `devPro` toggle (flip entitlement without a purchase). i18n vi + en.

**Accept (this session, dev adapter):** paywall reachable + themed (rose in gestational); devPro toggle flips gating; mid-flow cancel clean; price shown from product; `tsc` + tests green (hook + dev adapter tested with mock). Commit: `feat: iap rails and paywall (dev adapter)`.
**Deferred to Session 23 (real store):** sandbox purchase unlocks `pro`, survives restart + airplane mode; reinstall → Restore; console price change without release. Manual device smoke.

---

### Session 16: Free/Pro gating + "Theo bữa" analysis (growth plan S14)
**Goal:** turn on monetization — free stays generous, Pro sells shipped value.

- Single helper `useProGate(feature)`: free → paywall with matching `paywallSource`. All gates go through it.
- **Gate 1 — PDF from the 2nd export:** free while `reportCount === 0`; then paywall (`report_gate`) with contextual copy ("Mẹ đã dùng 1 báo cáo miễn phí…").
- **Gate 2 — Watermark:** `ReportService` takes `isPro` → Pro drops the "Tạo bởi app Sugar" footer; free keeps it (clinic-waiting-room growth channel).
- **Gate 3 — CSV export → Pro-only:** the **"Export CSV" button on the report screen** (Session 13) locks for non-Pro → paywall (`csv_gate`). *Supersedes PRD v1.1 (CSV was core-free) — record in PRD v1.4; app not launched, no real user loses anything.*
- **Gate 4 — "Advanced charts" = per-meal analysis, shipped this session:** domain `computeSlotStats(readings, range, protocol, targets)` → per slot [Đói | Sau sáng | Sau trưa | Sau tối]: count, average, % in range, delta vs previous equal period (pure TS, reuses `getDaySlots`, unit-tested). UI: segmented "Xu hướng | Theo bữa" on Trends, **gestational mode only**; free users see lock overlay → paywall (`charts_gate`).
- **Never gated:** logging, history, edit/delete, basic line chart, reminders, settings, first PDF report.

**Accept:** free flow — 1st PDF OK, 2nd opens paywall, mid-flow purchase resumes export; Pro PDF has no watermark; CSV locks/unlocks by entitlement; `computeSlotStats` tests cover duplicate-slot, empty slot, previous-period delta, unit display; general mode sees no "Theo bữa" segment and changes nothing besides the CSV gate; `tsc` + tests green. Commit: `feat: free/pro gating and per-meal analysis`

---

### Session 17: Supabase Auth — anonymous-first (growth plan S15)
Unchanged from the monetization addition. Summary:

- Supabase project **Singapore (ap-southeast-1)**; keys via EAS env. `@supabase/supabase-js` + session storage on **expo-secure-store**.
- **Google sign-in now** (`@react-native-google-signin/google-signin` → `signInWithIdToken`; web client ID + Android SHA-1 client from admin track). **Sign in with Apple deferred to the iOS-opening session** (App Review 4.8) — providers rendered from a config array so enabling Apple = one entry.
- Settings → "Tài khoản & sao lưu": signed-out = one explainer line ("Chỉ dùng để sao lưu…") + provider buttons; signed-in = provider/email, backup status placeholder (S18), Đăng xuất, Xóa tài khoản.
- **In-app account deletion (required by both stores):** Supabase Edge Function `delete-account` (verify JWT → `auth.admin.deleteUser` + delete `backups/{uid}/*`); double-confirm copy; sign-out after. Plus a public "Yêu cầu xóa tài khoản" page (GitHub Pages) for the Play Data Safety form.
- RevenueCat `logIn(user.id)` / `logOut()`; restore purchases never requires an account. No DB tables this session; no auth checks outside Account + backup flow.

**Accept:** Google sign-in works on device; session survives restart; sign-out clean; delete account removes user + storage prefix, reachable in ≤3 taps; entire app fully functional signed-out; `tsc` + tests green. Commit: `feat: supabase auth, account screen, delete account`

---

### Session 18: Cloud backup & restore — Pro ⭐ (growth plan S16)
Unchanged from the monetization addition. Summary:

- Private bucket `backups`, policy = own `auth.uid()/` prefix only; `backup_meta` table (RLS owner-only). **Single-slot** latest-only design (`backups/{uid}/sugar.db`, upsert) — fits the 1GB free tier, one-button UX.
- `BackupService`: `PRAGMA wal_checkpoint(TRUNCATE)` → copy sqlite file → upload upsert → upsert meta (`schema_version` = latest local migration id) → `lastBackupAt`.
- **Auto backup on foreground** when `isPro && session && now − lastBackupAt > 7 days` — no background task, zero battery.
- **Restore:** "Sao lưu gần nhất: {ngày} · {size}" + "Khôi phục về máy này" → overwrite warning → download → SQLite magic-header check → **reject if `schema_version` newer than app** ("hãy cập nhật app trước") → `closeDb()` → replace file → reopen (older snapshots auto-migrate) → reset zustand → success screen.
- Gate: whole feature Pro (`backup_gate`); NOW add "Sao lưu & khôi phục cloud" to `PRO_BENEFITS`. Privacy policy + Data Safety updated ("dữ liệu chỉ rời máy khi mẹ bật sao lưu…"); client-side E2E encryption deliberately deferred (lost-key trap), trade-off documented.
- Ops: Supabase free tier pauses after ~1 week idle — unpause/ping until real users back up weekly; upgrade only when depended on.

**Accept:** round-trip backup → Delete All Data → restore = identical readings + settings; older snapshot migrates; newer snapshot rejected with update message; manual RLS check (user A → user B object = 403); non-Pro sees locked state; auto-backup fires once per 7 days, not every foreground; `tsc` + tests green. Commit: `feat: cloud backup and restore`

---

### Session 19 (optional — default: SKIP): Banner ads for free tier (growth plan S17)
**Decision gate first, code later.** Build only if — after 6–8 weeks of paywall data — conversion <2% AND the "tắt quảng cáo" upsell is needed. Reasons to skip: low VN eCPM (~0.2–0.9tr/tháng at a few hundred DAU), AdMob SDK wrecks the privacy story, and "sạch, không quảng cáo" is a selling point.

If built: `react-native-google-mobile-ads`, exactly **one** adaptive banner at the bottom of History only; never interstitials, never ads on Log/Hôm nay/Report; `useIsPro()` → null (vanishes instantly on purchase); **non-personalized only** (`requestNonPersonalizedAdsOnly: true`, no ATT prompt); Data Safety/App Privacy + privacy policy updated; "Không quảng cáo" added to `PRO_BENEFITS`.

**Accept:** banner only for free users, only on History; disappears on purchase without restart; app fine when ad request fails; `tsc` + tests green. Commit: `feat: admob banner for free tier`

---

### Session 20: Launch, review & retention loop (growth plan S19 + §8.4)
- **Review prompt** (`expo-store-review`): after the **first** successful PDF export (share sheet closes → `requestReview()`); one-shot `reviewAskedAt`. *(Deviation from growth plan "after 2nd": the 2nd now sits behind the paywall → volume too small; OS quotas display frequency anyway.)* Fallback: 20th reading. Never re-ask.
- **Weekly summary notification:** on each foreground, cancel + reschedule fixed id `weekly-summary` for next Sunday 19:30; content from last 7 days: "Tuần này mẹ đo {n}/{expected} lần, {p}% trong ngưỡng 👍". Only when the week has **≥5 readings** (don't nag the postpartum/lapsed); low-% uses neutral supportive copy — **no guilt, no streaks** (§8 anti-pattern). Domain `buildWeeklySummary(readings, now)` pure + tested (counts, %, <5 → null).
- **Feedback loop:** small card after first report export + Settings row → Google Form link. About screen shows **"Mã hỗ trợ"** = RevenueCat `appUserID` (copyable) → grant promotional Pro to the 10 interview mums via RC dashboard, zero gift code needed.
- **Launch checklist (not code — separate issue):** final post per §7 template (vợ duyệt giọng văn); permission-granted group list; weeks 1–2 genuine engagement only; week 3 post in 2–3 groups; log every reply; answer comments within 24h.

**Accept:** review prompt invoked exactly once after first export; weekly notification reschedule idempotent (one id, correct next Sunday, assert via `getAllScheduledNotificationsAsync`); support code visible + copyable; `buildWeeklySummary` tests green; `tsc` + tests green. Commit: `feat: review prompt, weekly summary, feedback loop`

---

### Session 21: Postpartum lifecycle + Supplies (affiliate) screen (growth plan S20)
- **Trigger:** `conditionType === 'gestational' && dueDate && today ≥ dueDate` → Today header soft prompt "Mẹ sinh bé chưa? 🎉" [Rồi ạ] [Chưa] — dismiss/"Chưa" snoozes 7 days (`postpartumPromptSnoozedAt`).
- **"Rồi ạ" flow:** date picker `babyBornAt` (default today) → congrats screen → exactly one question: "Tiếp tục nhắc đo theo bữa?" (default **OFF** — most stop measuring) → off cancels smart after-meal + GDM-seeded reminders (Session 11 identifiers).
- **Postpartum mode** — branch #4 of the mode-switch principle (NOT a new `conditionType`; just `gestational` with `babyBornAt != null`):
  - Today becomes `PostpartumCard`: "Kiểm tra OGTT lại: tuần 4–12 sau sinh" + countdown + "Đã làm OGTT ✓".
  - Notification at `babyBornAt + 4 tuần`, repeat at `+10 tuần` if unmarked (careful copy, cites screening guidance — no diagnosis).
  - After marking (or past 12 weeks): **yearly screening reminder** — schedule exactly the next occurrence, reschedule on each app open (expo-notifications has no yearly trigger).
  - Secondary action: "Tiếp tục theo dõi đường huyết dài hạn" → confirm → re-apply **`general`** preset (theme returns to Evergreen; records untouched — preset-over-configuration). *(Updated: type2 mode removed per 2026-07-11 decision.)*
  - History/Trends/Report unchanged — pregnancy data viewable/exportable forever.
- **"Vật tư đo đường huyết" screen** (Settings row + small link under Today organizer): static list from `src/config/supplies.ts` (que thử Accu-Chek/On Call Plus/Sinocare…, kim chích, máy đo) — name + 1-line description + Shopee affiliate link via `expo-web-browser`. **Mandatory disclosure** at top: "Một số liên kết là link tiếp thị — Sugar nhận hoa hồng nhỏ, giá của mẹ không đổi." External physical-goods links are store-compliant (IAP only required for digital). Links updatable via **EAS Update** (JS-only).
- All strings i18n vi + en.

**Accept:** past `dueDate` → prompt appears; "Rồi ạ" sets `babyBornAt`, cancels meal reminders, schedules OGTT notification (assert via `getAllScheduledNotificationsAsync`); marking OGTT sets yearly reminder; "Tiếp tục theo dõi" switches preset without touching records (no new migration); Supplies screen opens external links + disclosure visible; `tsc` + tests green. Commit: `feat: postpartum arc and supplies screen`

---

### Session 22 (optional): Landing page + backlog triage (growth plan S21)
- **One-page landing** on GitHub Pages (beside privacy policy): hero + 3 features (report / nhắc đo / 2 chạm) + 2 screenshots + store badges + privacy link; SEO title "Sugar — Sổ theo dõi tiểu đường thai kỳ"; link it from store listing + About.
- Triage remaining growth-plan S21 items:
  - Widget quick-log: **defer** (native widget target outside managed workflow). → PRD Deferred.
  - Onboarding steps: **done** (Session 10) — skip.
  - Apple Health / Google Fit, food database, community: still deferred (§11).
  - **Meal-content logging + meal-photo AI analysis: deferred** (idea logged 2026-07-11 — revisit only with traction; pairs with the food-database deferral).
- Leftover polish: GDM empty-state copy, screenshot share template, 1.3× font-scale audit on new screens (paywall, account, vật tư, reminders, today).

**Accept:** landing live at public URL, fast on mobile, all links work; deferred backlog recorded in PRD. Commit: `chore: landing page`

---

### Session 23: Publish to Google Play + Apple App Store ⭐ (final launch)
**Goal:** the single launch moment — submit the fully-built app to both stores. Everything before this was build/prep; nothing shipped to real users yet.

**RevenueCat wiring (moved here 2026-07-12 — Session 15 shipped only the dev adapter):** this is where the real IAP finally goes in, once the Play merchant profile + RevenueCat project are verified. Steps: create Play merchant/payments profile → in-app product `sugar_pro_lifetime` **149.000₫** → RevenueCat project + Android app (`io.minhthang.sugar`) + entitlement `pro` + offering `default` → Google Cloud service account nối RC↔Play → `npm i react-native-purchases` → write `RevenueCatEntitlementRepository` (`src/data/`) implementing `EntitlementRepository` → return it from `getEntitlementRepository()` in `factory.ts` (the only line that changes) → set the RC public SDK key + Aptabase key via EAS env → run the deferred Session-15 acceptance on an EAS dev build (sandbox purchase unlocks `pro`, survives restart + airplane mode, reinstall→Restore, mid-flow cancel clean, console price change without release), Play **license testers** for no-charge sandbox. iOS product/`RevenueCat` app added alongside the Apple prerequisites below.

**Accounts & payment (decided 2026-07-12):** pay with **Vietcombank ECard** (Visa debit — enable international online payment + keep balance first). **Google Play: self-register under the user's own name** ($25 one-time) — no friend/third-party account. **Apple**: $99/yr recurring on the same ECard (keep balance for annual renewal), or defer/use a friend's Developer account at first if the yearly fee is heavy — but self-owned is preferred once there is revenue. Android is the priority store (VN GDM users are mostly Android).

**iOS-opening code prerequisites (must land before submitting Apple):** Apple Developer $99/năm → Paid Apps agreement + bank/tax → non-consumable `sugar_pro_lifetime` + add iOS app to RevenueCat → one code pass: **Sign in with Apple** (the auth provider config array from Session 17 gets its Apple entry enabled) + **StoreKit sandbox** verification + **App Privacy** answers. iOS `bundleIdentifier` already set (Session 14).

**Google Play submission:** production `.aab` via `eas build -p android --profile production` → upload → store listing (assets from Session 14) → Data Safety (updated per money-principle §4 milestones: purchases + backup opt-in) → **Start rollout**. Optional soft-launch first: internal-testing cohort of 10–15 mẹ ~1 week (growth plan §7), then public.

**Apple App Store submission:** `eas build -p ios --profile production` → TestFlight → App Store Review (4.8 Sign in with Apple satisfied) → submit.

**Both:** final screenshots per store specs; privacy policy + deletion-request URLs live; review-prompt / weekly-summary (Session 20) verified on production builds; RevenueCat products approved in both stores.

**Accept:** app live (or in review) on Google Play AND Apple App Store; sandbox→production IAP works on both; Data Safety / App Privacy accurate; soft-launch cohort invited (if used). This is a manual/admin-heavy session — see `docs/plans/2026-07-12-session-14-launch-guide.md` (extend it with the iOS + Apple steps here). Commit: `chore: production store submission`

---

## Money principles (apply to Sessions 15–19)

1. *Free tier is sacred:* logging, view/edit/delete, reminders, basic chart, and the **first** PDF report are never gated. Paywall only on derived value.
2. *One entitlement source of truth:* every gate goes through `useIsPro()` / `useProGate()` — never scattered purchase checks.
3. *Sell only what's shipped:* `PRO_BENEFITS` is a config array; a line is added only in the session that ships the feature.
4. *Privacy story evolves honestly:* "không thu thập dữ liệu" → "dữ liệu đường huyết chỉ nằm trên máy; chỉ rời máy khi mẹ bật sao lưu". Data Safety / App Privacy updated at S15 (purchases + optional anonymous analytics), S18 (backup opt-in), S19 (ads — if ever).
5. *IAP only:* all digital purchases via Apple/Google IAP. Never MoMo/bank transfer for Pro — store-policy violation, app-removal risk.

**Verified facts (2026-07-07):** VN supports Play merchant registration (paid apps + IAP, USD/EUR payout). RevenueCat free to $2,500 MTR/month (~64tr VND) then 1%. Play account created before 13/11/2023 → **no** 12-tester/14-day closed-testing requirement → straight to production at Session 23 (a newer account must budget ~2 extra weeks for closed testing). Aptabase free 20k events/month, fully anonymized, no consent banner; over limit = pause, no charge.

---

## PRD amendments — paste into PRD.md changelog

### v1.3 (updated 2026-07-11)
- **Positioning: GDM is the primary acquisition persona** (VN pregnant women, OGTT dx week 24–28, 4×/day for 12–16 weeks, report every 2–4 weeks). Elderly/type-2 persona and all elderly-first UI rules remain in full.
- **Condition profile & presets:** `conditionType` (`gestational | general` — **type2 removed 2026-07-11**, revive only with real features) + `dueDate` + `afterMealProtocol` (`1h | 2h | 1h+2h`) as `app_settings` keys (no migration). Presets initialize — never own — target ranges **and theme** (gestational = rose, general = evergreen). `readings` schema unchanged; GDM slots are projections.
- **Target ranges:** new optional `postMeal2hRange`; `evaluateReading` uses it for readings ≥2h after meals when set. GDM defaults: fasting 70–95, 1h 70–140, 2h 70–120 — always editable ("theo chỉ định bác sĩ").
- **Story 42 (PDF report) un-deferred** — spec in Session 13; **PDF + CSV share one export surface** (standalone Export screen removed; CSV locked spec unchanged).
- **Local scheduled reminders in scope** (expo-notifications): manual reminders (time + label) + smart after-meal reminders anchored on saved before-meal readings, incl. conditional 2h re-check under `1h+2h`. Deferred item narrowed to *server push (FCM/APNs)*.
- **Stories 56–60:** 56 condition select in onboarding · 57 GDM targets prefilled by doctor's protocol (1h/2h/both) · 58 "Hôm nay" tab for all modes, slots derived from reminders · 59 manual + smart reminders · 60 doctor report PDF (+ CSV button).
- Store listing → GDM positioning (Session 14). Monetization, auth + backup, ads/affiliate sequenced in this plan (v1.4).

### v1.4 (2026-07-07, confirmed 2026-07-11)
- **Sugar Pro — one-time 149.000₫** via IAP (`sugar_pro_lifetime`), RevenueCat entitlement `pro`. Never gate logging or viewing/editing own data.
- **Free/Pro matrix:** Free = unlimited logging/history/ranges/reminders/basic trends/weekly summary + **first PDF (watermarked)**. Pro = unlimited PDF + no watermark, **CSV export** *(supersedes v1.1 core-free CSV; pre-launch, no user loses anything)*, "Theo bữa" analysis, cloud backup & restore, (no-ads only if Session 19 activates).
- **Auth & backup partially un-deferred:** Supabase anonymous-first auth (Google now; Apple at iOS launch per 4.8; secure-store sessions; in-app account deletion + web deletion-request URL) + single-slot Pro backup/restore (private bucket + RLS). **Two-way sync / multi-device stays deferred.**
- **Postpartum lifecycle in scope:** `babyBornAt` settings key, post-due-date prompt, OGTT reminders (4–12 weeks + yearly), long-term switch re-applies the **general** preset, data untouched.
- **Supplies (affiliate) screen in scope:** static list, external Shopee links, mandatory disclosure, links via EAS Update.
- **Weekly summary notification** (local, Sun 19:30, only when week has ≥5 readings, no guilt/streak copy). **Review prompt:** once, after first successful PDF export (fallback 20th reading).
- **Stories 61–71:** 61 buy Pro · 62 restore purchases · 63 report gate from 2nd + watermark removal · 64 Theo bữa (Pro) · 65 Google sign-in (Apple at iOS) · 66 in-app account deletion · 67 cloud backup (Pro) · 68 restore to new device · 69 weekly summary · 70 postpartum + OGTT · 71 supplies/affiliate. *(72 ads — only if Session 19 passes its decision gate.)*
- **Data Safety / App Privacy by milestone:** S15 purchases + anonymous analytics (if enabled) · S18 backup opt-in · S19 advertising (if built). Marketing line becomes "dữ liệu đường huyết chỉ nằm trên máy của mẹ".
- **Deferred (new):** meal-content logging + meal-photo AI analysis; type-2 mode revival; widget quick-log.

---

## Admin track — no code, start NOW (parallel to Sessions 10–14)

Approval steps take days-to-weeks. **None of them block Sessions 15–22 anymore** (re-scoped 2026-07-12 — the paywall runs on a dev adapter); they gate **Session 23 (launch + RevenueCat wiring)**, so keep them moving in parallel:

1. **Play Console:** payments + merchant profile (VN supported; USD/EUR payout). Days to verify. *(Play account verification was the original blocker — it's fine if it's slow now.)*
2. **RevenueCat:** account + project + Android app (iOS later). Free tier covers the 10tr/tháng goal. **Wiring happens in Session 23**, not Session 15.
3. **Soft-launch cohort (recommended, not required):** account predates 13/11/2023 → no closed-testing gate; still invite 10–15 mẹ to internal testing ~1 week pre-public (interview pool + early crash/copy catch).
4. **Supabase:** org + project (Singapore) — Session 17.
5. **Google Cloud Console:** OAuth web client ID + Android client (EAS SHA-1) — Session 17.
6. **"Yêu cầu xóa tài khoản" page** on GitHub Pages — required in Data Safety before shipping Session 17's build.
7. **Aptabase** (if analytics confirmed): account + app key.
8. **Shopee affiliate** registration — Session 21.
9. **Tax:** confirm personal Google/Apple revenue declaration (~7%) with kế toán/chi cục thuế — before money arrives.

**iOS-opening checklist (now folded into Session 23 — Apple launches alongside Google):** Apple Developer $99/năm → Paid Apps agreement + bank/tax → non-consumable `sugar_pro_lifetime` + add iOS app to RC → 1 code pass: Sign in with Apple + StoreKit sandbox + App Privacy → TestFlight → review. *(Was previously "later, on demand" / Android-first; changed 2026-07-12 to publish both stores together at the end.)*

---

## Timeline & sequencing

**Updated 2026-07-12: build everything, then publish once at the end (Session 23) — Google + Apple together.** No early soft launch; no shipping the paywall via post-launch update. Trade-off: lose early real-user feedback, gain a single complete launch.

1. Sessions 10–14 (value + build rails/prep, **no submission**).
2. Sessions 15–16 (paywall + gating) → 17–18 (auth + backup) → 20 (retention loop) → 21 (postpartum + supplies). Session 19 (ads) waits for its 6–8 week decision gate. Session 22 opportunistic.
3. **Session 23 = the launch:** submit to Google Play + Apple App Store together (optional 1-week internal-testing cohort first per §7).

North star = PDF reports/week. Kill/pivot criteria (growth plan §9) unchanged: 3 months <500 installs or conversion <1.5% → change channel/positioning; 6 months <2tr/tháng → maintenance mode. Don't loosen the criteria under income pressure — they protect your time.

---

## Mapping & deviations (vs SUGAR-GROWTH-PLAN.md and the old addition files)

| Source | This plan | Change |
|---|---|---|
| GDM add. S10 | **Session 10** | type2 mode removed; `gdmTiming` → `afterMealProtocol` (+`1h+2h`); dual after-meal ranges; per-mode theme added; welcome stays step 1 |
| GDM add. S12 (reminders) | **Session 11** (swapped earlier) | fixed meal-time slots → manual list + smart after-meal anchored on before-meal readings + conditional 2h re-check |
| GDM add. S11 (Today) | **Session 12** (after reminders) | GDM-only → all modes; slots derived from reminders (not fixed 4); rose/evergreen theming |
| GDM add. S13 (PDF) | **Session 13** | absorbs CSV export; standalone Export screen removed; `1h+2h` cell rendering |
| GDM add. S14 / growth S18 | **Session 14** | unchanged |
| Money add. S15–S22 / growth S13–S17, S19–S21 | **Sessions 15–22** | unchanged except: CSV gate now lives on the report screen; Session 21 long-term switch targets `general` (no type2); meal-photo idea logged as deferred |
