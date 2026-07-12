# Bugfix: background/theme not following tracking mode + paywall CTA + back button

**Branch:** `bugfix/background-color-is-not-correct`
**Date:** 2026-07-12

## Problems

1. **Theme not applied per tracking mode.** In GDM (gestational → Rose) mode the background and many
   elements stay in the Evergreen (general) palette on Log, History, Trends, Settings, Reading Details,
   Edit Reading, and inside the Log form (calendar icon, "+ Notes", notes textarea).
2. **Paywall CTA text looks bad** — `"Mở khóa Sugar Pro — {{price}}"` uppercased + icon on one line
   crams/cuts the em-dash + price.
3. **Back button shows "(tabs)"** as its label on pushed screens (inconsistent, ugly).

## Root cause (investigated, confirmed)

The theme system itself is correct: `useTheme()` (`src/ui/theme/theme-context.tsx`) returns the active
`ColorScheme` selected from `conditionType` via `CONDITION_PRESETS`, and re-themes the subtree on change.

The bug is that many screens/components still import the **static `colors`** export
(`src/ui/theme/colors.ts:127`, Evergreen-only, back-compat) instead of reading `useTheme()`. This is the
exact failure mode CLAUDE.md warns about.

Key facts that scope the fix:
- **Only theme-VARYING tokens matter.** In `colors.ts`, `brand/surface/bg/border/borderStrong/surfaceMuted`
  differ between Evergreen/Rose. Text/card/divider/status(amber,orange)/shadow tokens are **constant**, so
  static use of *those* is harmless. We fix static use of varying tokens only:
  `primary, primaryDark, primaryLight, background, surface, surfaceMuted, border, borderStrong,
  inRange, inRangeBg, inRangeText, success`.
- **The app-wide culprit is `app/_layout.tsx:182,185`** — the root `<Stack>` `screenOptions.contentStyle`
  and `headerStyle` bake in static `colors.background`. That content background sits behind **every**
  pushed screen. Worse, `RootLayoutReady` *renders* `<ThemeProvider>`, so it cannot itself call
  `useTheme()`. Fix requires extracting an inner component that lives under the provider.
- The `ui/*` primitives (Button, Chip, Toggle, Stepper, SegmentedControl, Notice, BottomSheet, Card,
  AppText, Badge, IconTile, SectionLabel) **already** use `useTheme()` / only-constant tokens — leave them.

## Decisions (confirmed with user)

- **Scope:** full app-wide migration (fix root cause, comply with CLAUDE.md), not just reported screens.
- **Paywall CTA:** button label = `"Mở khóa Sugar Pro"` only; show price on a caption line **below** the
  button (`Chỉ {{price}} · một lần`). No price/em-dash inside the pill.

## STATUS (2026-07-12)

- ✅ **Task 1 DONE** — `app/_layout.tsx`: extracted `RootStack` under `<ThemeProvider>` (header/content bg now
  themed) + `headerBackButtonDisplayMode: 'minimal'` → **Bug #3 fixed app-wide**.
- ✅ **Task 2 DONE** — `settings/_layout.tsx`, `history/_layout.tsx` on `useTheme()`.
  Note: `(tabs)/_layout.tsx` was **already correct** — no change.
- ✅ **Task 3 DONE** — `log.tsx`, `trends.tsx`, `history/index.tsx`, `settings/index.tsx` on `useTheme()`.
  Note: Today `(tabs)/index.tsx` was **already correct** — no change.
- ⏳ **Remaining: Tasks 4, 5, 6, 7, 8** (do Task 7 before its callers in 4/5).
- Verified after 1–3: `tsc`, lint, 203 tests pass. Not yet verified on device.

## Migration recipe (apply consistently)

Module-level `StyleSheet.create` can't call hooks. Two established patterns already used in this repo — pick
per file:

- **Few varying tokens (≤~3):** add `const colors = useTheme();`, keep the StyleSheet for layout, and apply
  the varying color inline: `style={[styles.container, { backgroundColor: colors.background }]}`. Remove the
  varying token from the StyleSheet. (Pattern used in `paywall.tsx`, `onboarding.tsx`.)
- **Many varying tokens:** convert the StyleSheet to a factory `const makeStyles = (colors: ColorScheme) => StyleSheet.create({...})`
  and `const styles = useMemo(() => makeStyles(colors), [colors]);`. (Pattern used in `ui/button.tsx`.)

After each file: remove the now-unused `colors` from the `@/ui/theme` import (keep `spacing/radius/fontSize/etc.`).

---

## Task 1 — Root layout (highest leverage): `app/_layout.tsx`

- Extract the `<Stack>…</Stack>` (currently inside `RootLayoutReady`'s return, under `<ThemeProvider>`) into a
  new inner component `RootStack()` rendered as `<ThemeProvider><SafeAreaProvider>…<RootStack/>…`.
- In `RootStack`, `const colors = useTheme();` and use it for `headerStyle.backgroundColor`,
  `headerTintColor`, `contentStyle.backgroundColor`.
- **Also fixes Bug #3 here:** add to the same `screenOptions`:
  `headerBackButtonDisplayMode: 'minimal'` (chevron-only, consistent app-wide; no per-screen headerLeft).
- `BootSpinner`/`BootError`/`styles.center` run *before* the provider mounts → they can keep static `colors`
  (boot happens before a mode is even known; Evergreen is the correct neutral default). Leave them.

## Task 2 — Tab navigators (background/tabbar/header)

Each is a component rendered under the provider → use `useTheme()` directly:
- `app/(tabs)/_layout.tsx:24,27,28` — `tabBarActiveTintColor`, `tabBarStyle.backgroundColor/borderTopColor`,
  `headerStyle.backgroundColor`.
- `app/(tabs)/settings/_layout.tsx:13,16` — `headerStyle`/`contentStyle` background.
- `app/(tabs)/history/_layout.tsx:13,16` — same.

## Task 3 — Tab screens

- `app/(tabs)/log.tsx:43` — container `backgroundColor`.
- `app/(tabs)/trends.tsx:133,244,266,268` — spinner color, container bg, card surface, border.
- `app/(tabs)/history/index.tsx:178,214,238` — spinner, container bg, border.
- `app/(tabs)/settings/index.tsx:125` — `iconColor` (primary).
- `app/(tabs)/index.tsx` (Today) — already on `useTheme` but has static leftovers at `61,96`
  (`backgroundColor`, water icon). Switch those to the local scheme.

## Task 4 — Root-stack (pushed) screens

- `app/reading/[id]/index.tsx:41,89,90,99,150,160` — spinner, hero bg/value color via status util (see Task 7),
  container backgrounds.
- `app/reading/[id]/edit.tsx:28,57,66` — spinner + container backgrounds.
- `app/reminders.tsx:145,176,177,249,252,265` — primary text/icons, surface, borders.
- `app/tracking-mode.tsx:52,55,67` — has `useTheme` already; fix static leftovers (active border, IconTile
  color, chevron color).
- `app/report.tsx:251,263` — has `useTheme`; fix static `colors.surface` leftovers.
- `app/onboarding.tsx` (many: `136,144,155,211,243,254,294,305,313,314,333,387`) — has `useTheme`; migrate all
  static varying-token leftovers (dots, backgrounds, IconTiles, borders, preview box, inRangeText).
- `app/+not-found.tsx:28,40` — container bg + link color (low priority but include for completeness).

## Task 5 — Shared components (used across tabs)

- `src/ui/components/log-reading-form.tsx:403,419,420,492,557,579,603` — **the reported Log form issues**:
  calendar icon (`primary`), "+ Notes" icon + label (`primary`), notes textarea/section backgrounds
  (`background`), borders. Many tokens → use `makeStyles(colors)` factory.
- `src/ui/components/blood-sugar-chart.tsx:63,66,164,165,166,173,227,230,264,266` — line/point/axis/pointer
  colors + legend box bg/border. Factory pattern; the gifted-charts inline props take `colors.*` from
  `useTheme()`.
- `src/ui/components/reading-card.tsx:79` — `backgroundColor: colors.surface` leftover (already has
  `useTheme` + local `statusColor(evaluation, colors)`; just fix line 79).
- `src/ui/components/report-preview-table.tsx:43,59,80` — border colors (has `useTheme`; fix leftovers).
- `src/ui/components/reminder-editor-sheet.tsx:92,101,106,126,131` — input borders + time/calendar icons
  (has `useTheme`; fix leftovers).
- `src/ui/components/placeholder-screen.tsx:31` — container `backgroundColor`.

## Task 6 — Components that import static `colors` but use only CONSTANT tokens

`stat-card.tsx`, `setting-row.tsx`, `reading-list-item.tsx`, `app/target-range.tsx`, `app/about.tsx` did not
match the varying-token grep → not user-visible bugs. For CLAUDE.md compliance ("no static `colors` in
components"), migrate them to `useTheme()` opportunistically — **low risk, low priority**. Note:
`reading-list-item.tsx` renders status colors via the util in Task 7, so it becomes correct once Task 7 lands
even before its own migration.

## Task 7 — Status-color util boundary: `src/ui/utils/reading-display.ts`

`statusColor` / `statusBgColor` / `statusBadge` are pure functions (can't call `useTheme()`) that currently
read static `colors.inRangeText` / `colors.inRangeBg` (theme-varying) → always Evergreen even in Rose.

- Add a `colors: ColorScheme` parameter to all three (import the type from `@/ui/theme`).
- Update callers to pass the active scheme:
  - `app/reading/[id]/index.tsx:89,90,99` → `statusColor(evaluation, colors)` etc.
  - `src/ui/components/reading-list-item.tsx:62,69` → pass `useTheme()` result.
  - `src/ui/utils/__tests__/reading-display.test.ts:47,54` → pass a scheme (use `colorSchemes.evergreen`
    or `colorSchemes.rose`; ideally assert contrast for **both** schemes since Rose brand ink differs).
- `readingDisplay()` uses only `mealColor` (constant) → unchanged.

## Task 8 — Paywall CTA (Bug #2): `app/paywall.tsx` + i18n

- Change `paywall.cta` in `src/i18n/vi.json:9` and `en.json:9` to the bare action:
  `vi: "Mở khóa Sugar Pro"`, `en: "Unlock Sugar Pro"` (drop `— {{price}}`).
- Add a new price line key, e.g. `paywall.priceLine`:
  `vi: "Chỉ {{price}} · một lần"`, `en: "Just {{price}} · one-time"`.
- In `paywall.tsx`: `ctaLabel` becomes just `t('paywall.cta')` (icon stays). Render an
  `<AppText variant="caption" color={colors.textMuted}>` with `t('paywall.priceLine', { price: priceString })`
  directly under the CTA button, only when `priceString` is defined (else fall back to `ctaLoading` behaviour:
  keep the button disabled + show loading caption). The existing `paywall.oneTime` caption at the bottom can be
  removed or kept — avoid duplicating "một lần"; recommend folding it into `priceLine` and deleting `oneTime`
  usage.
- Price still always comes from `product.priceString` (never hardcode) — unchanged.

---

## Verification (Definition of Done)

1. `npx tsc --noEmit` passes.
2. `npm test` passes (esp. updated `reading-display.test.ts`).
3. Manual: switch tracking mode General ↔ GDM in Settings and confirm Rose (pink) applies to backgrounds,
   headers, tab bar, Log form (calendar/+Notes/textarea), History, Trends, Reading Details, Edit, onboarding,
   reminders, report, paywall.
4. Manual: pushed screens show a chevron-only back button (no "(tabs)" label) and still pop to the correct
   opener.
5. Manual: paywall CTA reads "Mở khóa Sugar Pro" with a clean price caption below.
6. Commit: `fix: apply per-mode theme app-wide, clean paywall CTA & back button`.

## Suggested execution order

Task 1 → 2 → 3 (fastest visible win: whole-app background follows mode) → 7 (status colors) → 5 → 4 → 8 → 6.
Tasks are largely independent per-file and can be parallelized across subagents; Task 7 must land before/with
its callers in Tasks 4–5. Run `tsc --noEmit` after each batch.
