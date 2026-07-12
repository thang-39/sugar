# Reading Detail — Single-Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Reading Detail screen to match the design: one card whose top is the colored value hero, followed by `Date` / `Time` / `Meal` / `Timing` rows, with Notes rendered **inside the same card** (only when notes exist) instead of a separate second card.

**Architecture:** Collapse the current three-block layout (standalone hero View + detail Card + separate Notes Card) into a single `Card` (padding 0, `overflow: hidden`) containing a colored hero sub-view and a padded content section. The `Timing` row shows a single combined string (`Before meal` or `{{n}} hours after meal`), replacing the separate `Timing` + `Time after meal` rows. `Date` and `Time` use the existing `formatDate` / `formatTime` utils, replacing the single `recordedAt` row. No domain/model changes.

**Tech Stack:** React Native, TypeScript (strict), i18next, existing `Card` / `AppText` / `Badge` / `Button` primitives.

---

## File Structure

- Modify: `app/reading/[id]/index.tsx` — layout + timing string derivation.
- Modify: `src/i18n/en.json`, `src/i18n/vi.json` — add `dateLabel`, `timeLabel`, and a combined `timingValue` under `readingDetail`.

No new files: the composite is screen-specific and small; it stays in the route file per the existing pattern.

---

### Task 1: Add detail-screen i18n keys

**Files:**
- Modify: `src/i18n/en.json` (the top-level `readingDetail` block, lines 418–431)
- Modify: `src/i18n/vi.json` (matching block)

- [ ] **Step 1: Add English keys**

In `src/i18n/en.json`, inside the top-level `"readingDetail"` object (starts line 418), add three keys after `"mealLabel": "Meal",`:

```json
    "dateLabel": "Date",
    "timeLabel": "Time",
    "timingValues": {
      "before": "Before meal",
      "after": "{{n}} hours after meal"
    },
```

Leave the existing `timingLabel`, `hoursAfterLabel`, `recordedAtLabel` keys in place (they become unused by this screen but other code/tests may reference `recordedAtLabel`; removing them is out of scope).

- [ ] **Step 2: Add Vietnamese keys**

In `src/i18n/vi.json`, inside the top-level `"readingDetail"` object, add after `"mealLabel": "Bữa ăn",`:

```json
    "dateLabel": "Ngày",
    "timeLabel": "Giờ",
    "timingValues": {
      "before": "Trước ăn",
      "after": "{{n}} giờ sau ăn"
    },
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./src/i18n/en.json'); require('./src/i18n/vi.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/en.json src/i18n/vi.json
git commit -m "feat: add reading-detail date/time/combined-timing i18n keys"
```

---

### Task 2: Rebuild the detail card layout

**Files:**
- Modify: `app/reading/[id]/index.tsx`

- [ ] **Step 1: Update imports**

Change the format import (line 15) to include `formatDate` and `formatTime`:

```ts
import { formatDate, formatTime, formatValue } from '@/ui/utils/format';
```

(`formatDateTime` is no longer used in this file — remove it from the import.)

- [ ] **Step 2: Derive the combined timing string**

After the `recordedAt` line (`const recordedAt = new Date(reading.recordedAt);`, line 66), add:

```ts
const timingText =
  reading.mealTiming === MealTiming.After
    ? t('readingDetail.timingValues.after', {
        n: reading.hoursAfterMeal !== undefined && reading.hoursAfterMeal >= 2 ? 2 : 1,
      })
    : t('readingDetail.timingValues.before');
```

- [ ] **Step 3: Replace the render body (hero + two cards)**

Replace the JSX from line 92 (`{/* Value hero with status tint */}`) through line 133 (the closing `</Card>` of the notes card) with a single card:

```tsx
{/* One card: colored value hero + detail rows + inline notes */}
<Card style={styles.detailCard}>
  <View style={[styles.hero, { backgroundColor: statusColor(evaluation, colors) }]}>
    <Badge
      label={t(`status.${evaluation}`).toUpperCase()}
      color={statusColor(evaluation, colors)}
      backgroundColor={colors.heroBadgeBg}
      style={styles.statusBadge}
    />
    <AppText variant="display" color={colors.onPrimary} style={styles.heroValue}>
      {formatValue(reading.value, preferredUnit)}{' '}
      <AppText weight="bold" color={colors.onPrimary}>
        {preferredUnit}
      </AppText>
    </AppText>
  </View>

  <View style={styles.rows}>
    <DetailRow label={t('readingDetail.dateLabel')}>
      {formatDate(recordedAt, preferredLanguage)}
    </DetailRow>
    <DetailRow label={t('readingDetail.timeLabel')}>
      {formatTime(recordedAt, preferredLanguage)}
    </DetailRow>
    <DetailRow label={t('readingDetail.mealLabel')}>
      {t(`logForm.mealTypes.${reading.mealType}`)}
    </DetailRow>
    <DetailRow label={t('readingDetail.timingLabel')}>{timingText}</DetailRow>
    {reading.notes !== undefined && (
      <View style={styles.notesBlock}>
        <AppText color={colors.textMuted}>{t('readingDetail.notesLabel')}</AppText>
        <AppText style={styles.notes}>{reading.notes}</AppText>
      </View>
    )}
  </View>
</Card>
```

Note: `heroBadgeBg` is a semi-transparent white pill background used behind the status badge on the colored hero. Add it to the theme in Step 4. If you prefer to avoid a token, use the literal `'rgba(255,255,255,0.25)'` inline instead and skip Step 4 — but the token is cleaner and re-themes safely (the value is mode-independent).

- [ ] **Step 4: Add the `heroBadgeBg` theme token**

In `src/ui/theme/colors.ts`, add `heroBadgeBg: 'rgba(255,255,255,0.25)'` to each entry of `colorSchemes` (both Evergreen and Rose — same value), alongside the other scheme fields, and add `heroBadgeBg: string;` to the `ColorScheme` type. If the file derives common fields from a shared spread, add it once there.

Run: `rg --color=never --no-heading -n "onPrimary" src/ui/theme/colors.ts` first to locate exactly where per-scheme fields are defined, and mirror that spot.

- [ ] **Step 5: Update the DetailRow to drop the value's right-alignment override if needed**

No change required — `DetailRow` (lines 19–30) already renders label-left / value-right, which matches the design rows. Keep it.

- [ ] **Step 6: Rewrite the styles**

In `makeStyles` (lines 151–198), replace the `hero`, `statusBadge`, `card`, `notes` entries and add `detailCard`, `rows`, `heroValue`, `notesBlock`:

```ts
detailCard: {
  padding: 0,
  overflow: 'hidden',
},
hero: {
  alignItems: 'center',
  paddingVertical: spacing.xl,
  gap: spacing.sm,
},
statusBadge: {
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.lg,
},
heroValue: {
  textAlign: 'center',
},
rows: {
  padding: spacing.lg,
  gap: spacing.sm,
},
detailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: spacing.md,
},
detailValue: {
  flexShrink: 1,
  textAlign: 'right',
},
notesBlock: {
  marginTop: spacing.xs,
  gap: spacing.xs,
},
notes: {
  fontFamily: fontFamily.regular,
  fontSize: fontSize.base,
},
```

Keep `screen`, `content`, `centerState` unchanged. Delete the old `card` style (replaced by `detailCard` + `rows`).

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Confirm `formatDateTime` and any now-unused style keys are removed (project has `noUnusedLocals`).

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: PASS. This screen has no unit tests; domain tests are untouched.

- [ ] **Step 9: Manual verification**

Run: `npx expo start`. From History, open a reading:
- The card shows the colored hero (badge + big value + unit) with rounded top corners, seamlessly continuing into the rows below (single card, no gap).
- Rows read `Date`, `Time`, `Meal`, `Timing` in order.
- `Timing` shows `Before meal`, `1 hours after meal`, or `2 hours after meal`.
- A reading **with** notes shows a Notes block inside the card; a reading **without** notes shows no Notes block (no "No notes" placeholder — it is now omitted entirely).
- Switch tracking mode to Gestational (Rose) in Settings and reopen a reading → hero uses the Rose status colors, badge pill still legible.

- [ ] **Step 10: Commit**

```bash
git add app/reading/[id]/index.tsx src/ui/theme/colors.ts
git commit -m "feat: single-card reading detail with inline notes matching design"
```

---

## Self-Review Notes

- **Spec coverage:** Notes inside the card (Task 2 Step 3); Date/Time/Meal/Timing rows (Step 3); combined timing string (Step 2 + i18n Task 1).
- **Behavior change:** the "No notes" placeholder is intentionally dropped — the design only shows the Notes block when notes exist (`detailHasNotes`). `readingDetail.noNotes` becomes unused; leave the key (harmless, may be referenced elsewhere — grep before deleting).
- **Timing bucket:** uses the same `>= 2` rule as `evaluate-reading.ts` so the displayed hours match the target-range logic.
- **Type token:** `heroBadgeBg` added to both schemes with the same value keeps `useTheme()` the single source (no static `colors` import), per CLAUDE.md.
