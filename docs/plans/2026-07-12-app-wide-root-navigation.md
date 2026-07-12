# App-wide navigation convention — flatten secondary screens to the root stack

**Date:** 2026-07-12
**Branch:** `feature/session-13-pdf-and-combine-csv`
**Goal:** One consistent, bug-proof rule for every non-tab screen so the header back button always shows and always returns to the exact screen that opened it — regardless of which tab launched it.

---

## Problem history

Reading detail/edit, doctor report, and reminders were reachable from **two tabs** (Today + History, Today + Settings). A route belongs to exactly one navigator, so nesting them inside a single tab's stack made the native back button pop within that tab's stack — landing on the wrong screen when opened cross-tab.

First fix attempt (manual `headerLeft` + `router.back()`) made it worse: `router.back()` walks the **root** history including tab switches, so History→detail→back jumped to Today.

Second fix (move to root, but wrapped in an intermediate `reading/_layout.tsx` / `(screens)/_layout.tsx` **nested stack**) removed the wrong-target bug but introduced a **missing back button**: the screen is the *first* route of the nested stack, so `navigation.canGoBack()` inside that nested navigator is `false` → React Navigation renders **no back button**. Only the parent (root) stack's left-edge swipe gesture still pops the group.

### Root cause (final)

> A nested stack's **first** screen never shows a back button. Wrapping a root-level screen in its own `_layout.tsx` Stack hides the back affordance.

The correct pattern: register the secondary screen **directly as a child of the root `<Stack>`** (no intermediate `_layout.tsx`). The root stack has `(tabs)` beneath the pushed screen, so `canGoBack()` is `true` and the native header renders a back button that pops back to the opener (Today, History, or Settings) — for free, no manual `router.back()`.

---

## Target convention (applies to the whole app)

| Screen kind | Where it lives | Header / back |
|-------------|----------------|---------------|
| **Tab root** (Today, Log, History list, Trends, Settings index) | `app/(tabs)/…` | managed per tab (in-screen `ScreenHeader` or the tab's own nested stack for the index title) — unchanged |
| **Every other screen** (detail, edit, report, reminders, target-range, tracking-mode, about, and anything added later) | **direct child of the root `<Stack>`** in `app/_layout.tsx` — file at `app/<name>.tsx` or `app/<seg>/[id]/*.tsx`, **no intermediate `_layout.tsx`** | native header + automatic back button, `headerShown: true` set per screen in `app/_layout.tsx` |

**Rule of thumb for future work:** if a screen is *not* one of the five tab roots, it is a root-stack screen. Never wrap a multi-entry (or any secondary) screen in its own nested Stack — that is exactly what kills the back button. Push it with an absolute path (`/report`, `/reading/[id]`) from anywhere.

Trade-off (accepted): root-stack screens present full-screen over the tab bar (tab bar hidden while viewing). This is standard for detail/tool screens and makes back-navigation unambiguous.

---

## Steps

### 1. Remove the intermediate nested layouts
- Delete `app/reading/_layout.tsx`.
- Delete `app/(screens)/_layout.tsx`.

### 2. Flatten file locations to the root
- `app/(screens)/report.tsx`      → `app/report.tsx`
- `app/(screens)/reminders.tsx`    → `app/reminders.tsx`   (keep `useLocalSearchParams<{ new?: string }>` — `/reminders?new=1` still works)
- `app/(tabs)/settings/target-range.tsx`  → `app/target-range.tsx`
- `app/(tabs)/settings/tracking-mode.tsx` → `app/tracking-mode.tsx`
- `app/(tabs)/settings/about.tsx`         → `app/about.tsx`
- `app/reading/[id]/index.tsx` and `app/reading/[id]/edit.tsx` stay in place (folder needed for the dynamic segment); only their `_layout.tsx` is removed.
- Remove the now-empty `app/(screens)/` folder.

All these files use `@/` alias imports only, so moving does not touch import paths.

### 3. Register the seven screens in the root stack (`app/_layout.tsx`)
- Pull `t` from `useTranslation()` (currently only `i18n` is destructured).
- Add shared header styling to the root `<Stack>` `screenOptions` (keep `headerShown: false` as the default; `(tabs)`/`onboarding` keep no header):
  ```tsx
  <Stack
    screenOptions={{
      headerShown: false,
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { fontSize: fontSize.lg, fontFamily: fontFamily.extrabold },
      contentStyle: { backgroundColor: colors.background },
    }}
  >
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
    <Stack.Screen name="reading/[id]/index" options={{ headerShown: true, title: t('screens.readingDetail.title') }} />
    <Stack.Screen name="reading/[id]/edit"  options={{ headerShown: true, title: t('screens.editReading.title') }} />
    <Stack.Screen name="report"        options={{ headerShown: true, title: t('screens.settings.report.title') }} />
    <Stack.Screen name="reminders"     options={{ headerShown: true, title: t('reminders.title') }} />
    <Stack.Screen name="target-range"  options={{ headerShown: true, title: t('screens.settings.targetRange.title') }} />
    <Stack.Screen name="tracking-mode" options={{ headerShown: true, title: t('screens.settings.trackingMode.title') }} />
    <Stack.Screen name="about"         options={{ headerShown: true, title: t('screens.settings.about.title') }} />
  </Stack>
  ```
  (`colors`, `fontSize`, `fontFamily` are already imported. Headers use the static Evergreen `colors` — same as the existing settings/history stack headers; header re-theming is a pre-existing gap, out of scope here.)

### 4. Trim the tab nested stacks
- `app/(tabs)/settings/_layout.tsx`: keep only `<Stack.Screen name="index" … />` (removes target-range, tracking-mode, about — report/reminders already removed).
- `app/(tabs)/history/_layout.tsx`: already only `index` — no change.

### 5. Update all push call sites to absolute root paths
- `app/(tabs)/settings/index.tsx`:
  - `/(tabs)/settings/tracking-mode` → `/tracking-mode`
  - `/(tabs)/settings/target-range`  → `/target-range`
  - `/(tabs)/settings/about`         → `/about`
  - (`/reminders`, `/report` already correct)
- `app/(tabs)/index.tsx` (Today): `/report`, `/reminders?new=1`, `/reading/[id]` — already correct.
- `app/reading/[id]/index.tsx`: `/reading/[id]/edit` — already correct.
- `router.back()` inside detail (post-delete), edit (post-save), target-range, tracking-mode still works: it pops the root stack back to the opener. Native header back does the same. Both fine.

### 6. Verify
- `npx tsc --noEmit` → 0
- `npm test` → 193/193
- `npm run lint` → 0
- `.expo/types` regen not required (tsc already accepted the earlier root routes without it); if a route type ever complains, run `npx expo start` once with the sandbox disabled.
- **Manual device smoke** — for each of the 7 screens confirm: (a) a visible header back button at top-left, (b) tapping it returns to the exact opener, (c) left-edge swipe also works. Specifically:
  - History list → detail → back = History list
  - Today → detail → back = Today
  - detail → edit → back = detail
  - Settings → report / reminders / target-range / tracking-mode / about → back = Settings
  - Today → report / reminders → back = Today

---

## Out of scope
- Tab-root header styling (Today/Log/Trends use in-screen `ScreenHeader`; History/Settings index use their tab's nested stack for the title) — left as-is.
- Header color re-theming for Rose mode (pre-existing; all stack headers use static Evergreen `colors`).
- The Today-tab reading-row unit display fix (already committed separately in this branch's working tree).
