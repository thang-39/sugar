# SUGAR-23-FE-Accessibility

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-52 (screen reader support and proper contrast) |
| **Status** | Not started |
| **Blocked by** | SUGAR-15-FE-Log-Reading-Screen, SUGAR-16-FE-History-List-Screen, SUGAR-17-FE-Reading-Detail-Edit-Screens, SUGAR-18-FE-Trends-Screen, SUGAR-19-FE-Settings-Screen |

---

## Context

The app must be usable by people with visual impairments. This means screen reader compatibility (VoiceOver on iOS, TalkBack on Android) and adequate color contrast. This user story is a **final pass** across all screens built in Phase 1 to ensure accessibility standards are met.

---

## User Story

> As a **visually impaired user**, I want the app to work with my screen reader and have clear, readable text so that I can log and review my blood sugar readings independently.

---

## Acceptance Criteria

### AC-1: All interactive elements are readable by screen readers

Every tappable element in Phase 1 screens has a descriptive label so a screen reader can announce it clearly:

| Screen | Element | Required label content |
|---|---|---|
| Onboarding | Get Started button | "Get started" |
| Onboarding | Skip link | "Skip and use guest mode" |
| Log Reading | Value input | "Blood sugar value" |
| Log Reading | Unit toggle | Current unit + "Switch unit" (e.g. "mg/dL. Switch unit") |
| Log Reading | Date/time picker | "Select date and time" |
| Log Reading | Meal type chips | The meal name (e.g. "Breakfast", "Lunch") |
| Log Reading | Before/After chips | The timing (e.g. "Before meal", "After meal") |
| Log Reading | Hours after chips | The hour count (e.g. "2 hours after meal") |
| Log Reading | Notes toggle | "Add notes" |
| Log Reading | Save button | "Save reading" |
| History | Reading row | Value, date, and meal context (e.g. "120 mg/dL on Apr 5 at 2:30 PM, Breakfast After") |
| History | Date filter button | "Filter by date" |
| History | Clear filter | "Clear date filter" |
| Detail | Edit button | "Edit this reading" |
| Detail | Delete button | "Delete this reading" |
| Trends | Scale button | Scale name (e.g. "Show 7 days", "Show 30 days") |
| Settings | Unit selector | "Blood sugar unit, currently [unit]" |
| Sync icon | Header icon | "Sync status: [N] pending readings. Tap for details." |

### AC-2: Color contrast is sufficient

All text and interactive elements meet WCAG AA contrast requirements:

- **Normal text** (under 18pt / 14pt bold): minimum contrast ratio **4.5:1**
- **Large text** (18pt+ or 14pt+ bold): minimum contrast ratio **3:1**
- **UI components and graphic objects**: minimum contrast ratio **3:1**

Contrast must be checked for:
- Primary text on background
- Button text on button background
- Chip text on chip background
- Icon color on background

If any element fails, the color must be adjusted before shipping.

### AC-3: Touch targets are large enough

All tappable elements must be at least **44×44 points** in size. Elements smaller than this must have their touch area expanded (e.g. via padding) so the minimum target is met.

Specifically check: meal type chips, Before/After chips, and hour-selection chips on the Log Reading form. If any are below 44pt, increase their padding.

### AC-4: Semantic roles are set correctly

Screen readers understand elements better when they have the right role:

| Element type | Required role |
|---|---|
| Buttons | `"button"` |
| Tappable list rows | `"button"` |
| Toggle switches | `"switch"` |
| Section headings | `"header"` |
| Modal dialogs | `"dialog"` |
| Toggle chips | `"button"` |

### AC-5: Reading order is logical

When navigating with a screen reader, elements must be read in a logical order:
- Screen title
- Main content
- Form fields (top to bottom, left to right)
- Action buttons (bottom of screen last)

### AC-6: Screen reader testing completed

- Tested on a real device (not just an emulator) with VoiceOver (iOS) or TalkBack (Android)
- Verified: all interactive elements are reachable and labeled
- Verified: all form errors and alerts are announced
- Verified: no elements trap focus or cause infinite loops

---

## Definition of Done

- [ ] All interactive elements have `accessibilityLabel` matching the table in AC-1
- [ ] All contrast ratios meet WCAG AA (verified with a contrast checker tool)
- [ ] All chip touch targets are ≥44pt (padding fix applied where needed)
- [ ] `accessibilityRole` set correctly on all interactive elements
- [ ] Screen reading order is logical
- [ ] Tested on a real device — no accessibility errors reported

---

## Notes

- Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) or Figma's built-in contrast inspector to verify AC-2
- The chip padding fix in AC-3 applies to `LogReadingScreen`, `EditReadingScreen`, and `HistoryListScreen`
- WCAG 2.1 defines a "large text" exception at 3:1 for text ≥18pt or bold ≥14pt — identify which elements qualify for this exception
- Accessibility testing on a real device is significantly more reliable than an emulator
