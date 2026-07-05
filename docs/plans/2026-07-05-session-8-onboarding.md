# Session 8 — Onboarding + First-Run Flow

**Stories:** 47–48 · **PRD refs:** "Onboarding", "Clear All Local Data"
**Goal:** A single-screen onboarding shown once on first run (and again after delete-all), with language + unit pickers, disclaimer, and Get Started / Skip.

## Current state (verified)

- `app/onboarding.tsx` is a `PlaceholderScreen` stub.
- `app/_layout.tsx` loads `onboardingDone` into the settings store at boot but **no routing gates on it**. Onboarding is declared in the root `Stack` with `presentation: 'modal'` and never navigated to.
- `settings/index.tsx` `performDelete()` does `router.replace('/(tabs)')` — must go to onboarding after wipe.
- `DEFAULT_SETTINGS.onboardingDone = false`; `clearAllData` resets `app_settings` to defaults; `resetToDefaults()` resets the store → after delete-all, `onboardingDone` is already false; only a redirect is needed.
- Primitives available: `AppText, Button, Card, SegmentedControl, SectionLabel, IconTile`. Theme tokens: `primary` (green), `primaryButton`/`ink` (CTA), `accentBlue/#4E7CF6`, `accentPurple/#8B5CF6`, `accentOrange`, `amber/#F5B301`.
- Design reference: `design/Sugar App.dc.html` lines 27–61 (ONBOARDING block).

## Design reconciliation

The design onboarding has: drop logo tile + "SUGAR" + tagline, a hero line ("Your `Simple` way of Tracking Blood Sugar"), a 2×2 feature grid (Log readings / See trends / Export CSV / Works offline), a **Preferred unit** segmented, disclaimer footer, dark pill **GET STARTED**, top-right **Skip** link.

**Conflict:** the design has **no language picker**, but PRD stories 47–48 require one in onboarding. **PRD wins** → add a Language picker (segmented, Tiếng Việt / English) styled to match the unit picker. Everything else follows the design visually, mapped to primitives (Ionicons `water` via `IconTile`; feature grid cards use accent tokens; CTA = `Button variant="primary"`, Skip = `Button variant="ghost"`).

## Decisions

- **Picker persistence:** live-persist. Each tap calls `updateSetting(...)` (which already persists + switches i18n for language). Get Started only flips `onboardingDone`. Skip resets to vi + mg/dL defaults then flips `onboardingDone`.

## Changes

### 1. First-run gating — `app/_layout.tsx`
- In `RootLayoutReady`, read `onboardingDone` from the store.
- Add a `useEffect` guarded by `useRootNavigationState()?.key` (navigator mounted) that calls `router.replace('/onboarding')` when `onboardingDone === false`.
- Remove `presentation: 'modal'` from the onboarding `Stack.Screen` (full-screen first-run; reused after delete-all). Keep gesture disabled so it can't be swiped away before a choice: `options={{ gestureEnabled: false }}`.

### 2. Onboarding screen — `app/onboarding.tsx`
Full-screen `SafeAreaView` + `ScrollView`, built from primitives:
- Top row: **Skip** (`Button variant="ghost"`, right-aligned).
- Hero: `IconTile icon="water"` + `app.name` + `app.tagline`.
- Feature grid (2×2) of colored cards (accentBlue/purple/amber/orange) — copy from i18n.
- **Language** segmented (vi/en) → `updateSetting('preferredLanguage', v)`.
- **Preferred unit** segmented (mg/dL / mmol/L) → `updateSetting('preferredUnit', v)`.
- Disclaimer (`common.disclaimer`).
- **Get Started** (`Button variant="primary"`, full-width): `await updateSetting('onboardingDone', true)` → `router.replace('/(tabs)')`.
- **Skip**: set vi + mg/dL + `onboardingDone=true`, then `router.replace('/(tabs)')`.
- Elderly-first: base font ≥17, full-width CTA, holds at 1.3× font scale.

### 3. Delete-all redirect — `app/(tabs)/settings/index.tsx`
- `performDelete()`: `router.replace('/(tabs)')` → `router.replace('/onboarding')`.

### 4. i18n — `src/i18n/vi.json` + `en.json`
Expand `screens.onboarding`: keep `title`; add `heroPrefix`, `heroHighlight`, `heroLine`, `features.{log,trends,export,offline}.{title,subtitle}`, `languageLabel`, `unitLabel`, `getStarted`, `skip`. Reuse `app.tagline`, `common.disclaimer`.

## Testing / DoD

- No new domain logic → no new unit tests (per CLAUDE.md testing scope). `npx tsc --noEmit` + `npm test` stay green.
- Manual (Accept criteria): (a) fresh install shows onboarding once; (b) Skip → Log tab with vi + mg/dL; (c) delete-all → onboarding shows again.
- Commit: `feat: onboarding`.
