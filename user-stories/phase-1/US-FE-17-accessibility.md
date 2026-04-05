# US-FE-17 — Accessibility & Polish

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 52: Screen reader support and proper contrast

## Goal
Do a final accessibility pass across all screens built in Phase 1. Ensure all interactive elements have `accessibilityLabel` / `accessibilityHint`, all images have `alt` text equivalents, contrast ratios are adequate, and touch targets are ≥44pt.

---

## Steps

### 1. Accessibility Checklist

Go through each screen and verify:

**LogReadingScreen:**
- [ ] Blood sugar value input — `accessibilityLabel="Blood sugar value"` ✅ (already added)
- [ ] Unit toggle button — `accessibilityLabel="Switch unit to mmol/L"` (dynamic)
- [ ] Date/time picker — `accessibilityLabel="Select date and time"`
- [ ] Each meal type chip — `accessibilityLabel="Select Breakfast"` etc.
- [ ] Each timing chip — `accessibilityLabel="Select Before meal"` etc.
- [ ] Hours after chips — `accessibilityLabel="2 hours after meal"` etc.
- [ ] Notes toggle — `accessibilityLabel="Add notes"`
- [ ] Save button — `accessibilityLabel="Save reading"` ✅ (already added)

**HistoryListScreen:**
- [ ] Each list item — `accessibilityLabel="Reading: 120 mg/dL on Apr 5 2026"` (dynamic)
- [ ] Filter buttons — `accessibilityLabel="Select start date"` / `"Select end date"`
- [ ] Clear filter button — `accessibilityLabel="Clear date filter"`

**ReadingDetailScreen:**
- [ ] Edit button — `accessibilityLabel="Edit this reading"`
- [ ] Delete button — `accessibilityLabel="Delete this reading"`

**TrendsScreen:**
- [ ] Each time scale button — `accessibilityLabel="Show 7 days"`
- [ ] Chart data points — handled by `react-native-gifted-charts`

**SettingsScreen:**
- [ ] Unit selector — `accessibilityLabel="Blood sugar unit, currently mg/dL. Tap to change."`
- [ ] Export nav row — `accessibilityLabel="Export data"`
- [ ] Account nav row — `accessibilityLabel="Account"`
- [ ] About nav row — `accessibilityLabel="About"`

**OnboardingScreen:**
- [ ] "Get Started" button — `accessibilityLabel="Get started"`
- [ ] "Skip" link — `accessibilityLabel="Skip and use guest mode"`

### 2. Color Contrast Check

Light theme only. Verify these pairs meet WCAG AA (4.5:1 for normal text, 3:1 for large text):

| Element | Text Color | Background | Contrast | Pass? |
|---|---|---|---|---|
| Primary text | `#212121` | `#FFFFFF` | 15.9:1 | ✅ |
| Secondary text | `#757575` | `#FFFFFF` | 4.6:1 | ✅ |
| Button text | `#FFFFFF` | `#2196F3` | 4.6:1 | ✅ |
| Chip text (active) | `#2196F3` | `#E3F2FD` | 3.2:1 | ✅ |
| Disclaimer text | `#795548` | `#FFF8E1` | 4.9:1 | ✅ |

### 3. Touch Target Check

All buttons and touch targets must be ≥44pt × 44pt:

| Element | Current | Required | Pass? |
|---|---|---|---|
| Unit toggle | ~44pt | ≥44pt | ✅ |
| Chip buttons | ~36pt | ≥44pt | ❌ needs padding |
| Save button | ~52pt | ≥44pt | ✅ |
| Nav rows | ~44pt+ | ≥44pt | ✅ |

Fix chips: increase padding to `paddingHorizontal: 16, paddingVertical: 10`.

### 4. Semantic Roles

Add `accessibilityRole` where appropriate:

```tsx
// List item
accessibilityRole="button"

// Section heading
accessibilityRole="header"

// Navigation row
accessibilityRole="link"

// Form field
accessibilityRole="text"

// Toggle
accessibilityRole="switch"
```

### 5. Screen Reader Order

Ensure reading order is logical. Use `accessibilityTreeFlow` if needed. Test with:
- iOS: VoiceOver (Settings → Accessibility → VoiceOver → Open app)
- Android: TalkBack (Settings → Accessibility → TalkBack)

### 6. Update Chip Styles in All Screens

In `LogReadingScreen.tsx` and `EditReadingScreen.tsx`, update chip padding:

```ts
// Before:
chip: { paddingHorizontal: 14, paddingVertical: 8, ... }

// After:
chip: { paddingHorizontal: 16, paddingVertical: 10, ... }
```

---

## Verification

- [ ] All interactive elements have `accessibilityLabel`
- [ ] All chips have `paddingVertical: 10` (≥44pt touch target)
- [ ] Color contrast meets WCAG AA
- [ ] VoiceOver / TalkBack can navigate all screens
- [ ] No missing accessibility props found

---

## Dependencies
- **All other FE user stories** should be complete before this task.
