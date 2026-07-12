# Settings — Sugar Pro Promo Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent **amber ("vàng") promo card** for Sugar Pro to the Settings screen (matching design Image #3), shown only when the user is not Pro. The card carries the tagline `Unlimited exports · No ads · Backup` and an `Upgrade →` affordance that opens the paywall. The amber accent is a **fixed color shared across both tracking modes** (Daily/Evergreen and Gestational/Rose) — it must NOT switch with the per-mode brand color.

**Architecture:** A new dumb presentational component `ProPromoCard` reads `useTheme().accentAmber` (which resolves from `constant.amber` and is identical in both schemes, so it stays amber in Rose mode) and calls an injected `onPress`. Settings renders it above the existing "Sugar Pro" section only when `!isPro`, and hides the redundant "Sugar Pro" `SettingRow` in the not-Pro state (the card replaces it); the `Unlocked ✓` row stays for the Pro state. The full `/paywall` screen and `PRO_BENEFITS` are untouched.

**Tech Stack:** React Native, TypeScript (strict), i18next, existing `Card` / `AppText` primitives, Ionicons, `useTheme()`, `useIsPro()`.

---

## File Structure

- Create: `src/ui/components/pro-promo-card.tsx` — the amber promo card (presentational, theme-aware).
- Modify: `app/(tabs)/settings/index.tsx` — render the card when `!isPro`, adjust the Pro section.
- Modify: `src/i18n/en.json`, `src/i18n/vi.json` — add `proPromo.tagline` and `proPromo.upgrade` under `screens.settings.index`.

---

### Task 1: Add promo-card i18n keys

**Files:**
- Modify: `src/i18n/en.json` (`screens.settings.index`, after `proUnlocked` at line 134)
- Modify: `src/i18n/vi.json` (matching block)

- [ ] **Step 1: Add English keys**

In `src/i18n/en.json`, inside `screens.settings.index`, add after `"proUnlocked": "Unlocked ✓",`:

```json
        "proPromo": {
          "tagline": "Unlimited exports · No ads · Backup",
          "upgrade": "Upgrade"
        },
```

- [ ] **Step 2: Add Vietnamese keys**

In `src/i18n/vi.json`, inside `screens.settings.index`, add after `"proUnlocked": "Đã mở khóa ✓",`:

```json
        "proPromo": {
          "tagline": "Xuất không giới hạn · Không quảng cáo · Sao lưu",
          "upgrade": "Nâng cấp"
        },
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./src/i18n/en.json'); require('./src/i18n/vi.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/vi.json
git commit -m "feat: add Sugar Pro promo-card i18n keys (vi+en)"
```

---

### Task 2: Build the `ProPromoCard` component

**Files:**
- Create: `src/ui/components/pro-promo-card.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/ui/components/pro-promo-card.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppText } from '@/ui/components/ui';
import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';

interface ProPromoCardProps {
  onPress: () => void;
}

/**
 * Amber Sugar Pro upsell shown in Settings when the user is not Pro.
 * The amber accent is mode-independent (constant.amber in both color schemes),
 * so it stays yellow in both Daily (Evergreen) and Gestational (Rose) modes.
 */
export function ProPromoCard({ onPress }: ProPromoCardProps): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('screens.settings.index.rows.pro')}
    >
      <View style={styles.header}>
        <Ionicons name="ribbon" size={22} color={colors.text} />
        <AppText variant="heading" weight="extrabold" color={colors.text}>
          {t('screens.settings.index.rows.pro')}
        </AppText>
      </View>
      <AppText style={styles.tagline} color={colors.text}>
        {t('screens.settings.index.proPromo.tagline')}
      </AppText>
      <View style={styles.pill}>
        <AppText weight="extrabold" color={colors.text}>
          {t('screens.settings.index.proPromo.upgrade')}
        </AppText>
        <Ionicons name="arrow-forward" size={16} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.accentAmber,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tagline: {
      opacity: 0.9,
    },
    pill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
  });
```

Note on text color: the design uses white text on the green brand card, but on amber (`#F5B301`) white fails contrast. Dark text (`colors.text` ≈ `#1B2B24`) on amber is high-contrast and elderly-friendly (CLAUDE.md UI rule), so this card uses dark text throughout. The `Upgrade` pill uses `colors.card` (white) with dark text.

- [ ] **Step 2: Verify `radius.pill` and `radius.xl` exist**

Run: `rg --color=never --no-heading -n "pill|xl" src/ui/theme/spacing.ts`
Expected: both `pill` and `xl` keys are present on the `radius` object. If `radius.pill` does not exist, use `radius.round` / the largest available pill radius token (check the file) instead — do NOT hardcode `999`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/components/pro-promo-card.tsx
git commit -m "feat: add amber Sugar Pro promo card component"
```

---

### Task 3: Render the promo card in Settings

**Files:**
- Modify: `app/(tabs)/settings/index.tsx`

- [ ] **Step 1: Import the component**

Add after the `SettingRow` import (line 11):

```ts
import { ProPromoCard } from '@/ui/components/pro-promo-card';
```

- [ ] **Step 2: Extract a paywall-open handler**

Inside `SettingsScreen`, after the `isPro` / `setDevPro` hooks (around line 42), add:

```ts
const openPaywall = (): void =>
  router.push({ pathname: '/paywall', params: { paywallSource: 'settings' } });
```

- [ ] **Step 3: Render the promo card + adjust the Pro section**

Replace the Pro section block (lines 174–202) — the `SectionLabel` + `Card` containing the pro `SettingRow` and the analytics `SettingRow` — with:

```tsx
{!isPro && <ProPromoCard onPress={openPaywall} />}

<SectionLabel style={styles.sectionLabel}>
  {t('screens.settings.index.sections.pro')}
</SectionLabel>
<Card style={styles.group}>
  {isPro && (
    <SettingRow
      icon="star"
      iconColor={colors.accentAmber}
      label={t('screens.settings.index.rows.pro')}
      value={t('screens.settings.index.proUnlocked')}
    />
  )}
  <SettingRow
    icon="bar-chart"
    iconColor={colors.accentBlue}
    label={t('screens.settings.index.rows.analytics')}
    isLast
    trailing={
      <Toggle
        value={analyticsEnabled}
        onValueChange={(v) => void updateSetting('analyticsEnabled', v)}
        accessibilityLabel={t('screens.settings.index.rows.analytics')}
      />
    }
  />
</Card>
```

(The old pro `SettingRow`'s `onPress → /paywall` navigation is now carried by the promo card via `openPaywall`; the analytics row is unchanged except it is always `isLast`.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Manual verification**

Run: `npx expo start`. On the Settings tab:
- **Not Pro:** the amber Sugar Pro card appears above the Pro section, showing `Sugar Pro`, the tagline `Unlimited exports · No ads · Backup`, and an `Upgrade →` pill. Tapping anywhere on the card opens `/paywall`. The old "Sugar Pro" list row is gone; only the analytics toggle remains in the group card.
- Toggle **Enable Pro (dev)** ON → the amber card disappears; the group card now shows a "Sugar Pro — Unlocked ✓" row above analytics.
- Switch tracking mode to **Gestational (Rose)** → the promo card **stays amber/yellow** (does not turn pink), confirming the shared color.

- [ ] **Step 7: Commit**

```bash
git add "app/(tabs)/settings/index.tsx"
git commit -m "feat: show amber Sugar Pro promo card in settings when not pro"
```

---

## Self-Review Notes

- **Spec coverage:** amber card with `unlimited exports · no ads · backup` tagline + Upgrade → paywall (Tasks 2–3); shared color across modes (uses `accentAmber` = `constant.amber`, verified identical in both schemes); paywall + `PRO_BENEFITS` untouched.
- **Entitlement seam:** visibility keys off `useIsPro()` only — no scattered purchase checks (CLAUDE.md).
- **No hardcoded hex:** background from `colors.accentAmber`, radii/spacing from theme tokens; text color justified for contrast.
- **Pro state preserved:** the `Unlocked ✓` row still shows when Pro, so the settings entry point isn't lost after purchase.
