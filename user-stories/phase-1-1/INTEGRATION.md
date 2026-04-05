# Phase 1-1 — Integration Checklist

> Run through all items after completing all SUGAR-## user stories. Every box must be checked before declaring Phase 1-1 complete.

---

## Onboarding

- [ ] Fresh app launch → onboarding screen shown
- [ ] Unit picker visible with mg/dL and mmol/L options
- [ ] Medical disclaimer visible
- [ ] "Get Started" → unit saved, onboarding complete, main app shown
- [ ] "Skip" → default mg/dL, onboarding complete, main app shown
- [ ] Kill and relaunch → onboarding NOT shown again

---

## Log a Reading

- [ ] Value field accepts numeric input
- [ ] Unit toggle switches between mg/dL and mmol/L
- [ ] Changing unit clears the value field
- [ ] Date/time picker defaults to now
- [ ] Date/time is editable
- [ ] Meal type defaults to Breakfast
- [ ] Timing defaults to Before
- [ ] Selecting "After" → hours selector appears (0h–6h)
- [ ] Selecting "Before" → hours selector hidden
- [ ] Notes field collapsed by default, expands on tap
- [ ] Entering 95 mg/dL → saves without warning
- [ ] Entering 5 mg/dL → warning confirmation dialog appears
- [ ] "Save Reading" → Alert shown
- [ ] After save → form resets to defaults
- [ ] Saved reading has `syncStatus: 'pending'` in WatermelonDB

---

## Unit Conversion

- [ ] Log in mg/dL → stored as entered value in DB
- [ ] Log in mmol/L → converted to mg/dL before storing
- [ ] History shows correct value in user's preferred unit
- [ ] Detail screen shows correct value in user's preferred unit
- [ ] Trends chart shows correct value in user's preferred unit
- [ ] Changing unit in Settings → all displayed values update instantly, no app restart

---

## History List

- [ ] Reading from Log screen appears in History (newest first)
- [ ] Each row shows: value, unit, date, time, meal chip
- [ ] Notes preview shown if present
- [ ] Reading count shown in header
- [ ] Date range filter → list updates
- [ ] "Clear" → all readings shown
- [ ] Count shows "X of Y" when filtered
- [ ] Empty state shown when no readings
- [ ] Tapping row → navigates to detail screen

---

## Detail & Edit

- [ ] Detail shows all fields correctly
- [ ] Values displayed in user's preferred unit
- [ ] "Edited" label shown if reading was edited
- [ ] Edit button → pre-populated form shown
- [ ] Editing and saving → `updatedAt` bumped, `syncStatus` = pending
- [ ] Delete → confirmation dialog → reading removed from list
- [ ] Back navigation returns to history

---

## Trends

- [ ] Line chart renders with logged reading
- [ ] All 5 time scales (7D / 30D / 90D / All / Custom) appear and update the chart
- [ ] Custom range picker (From / To) works and shows the chart for the selected period
- [ ] Aggregation rule enforced: any range ≥30 days uses daily averages; <30 days uses individual points
- [ ] 30D and 90D show daily averages
- [ ] 7D and custom <30 days show individual points
- [ ] Custom ≥30 days shows daily averages
- [ ] Tapping a point shows tooltip with value and date
- [ ] Empty state shown when no readings
- [ ] Note about target range band is visible

---

## Settings

- [ ] Unit toggle visible
- [ ] Changing unit → all screens update instantly
- [ ] Unit preference persists across restarts
- [ ] "About" → version and disclaimer visible
- [ ] "Export Data" → placeholder screen
- [ ] "Account" → placeholder screen

---

## Offline Mode

- [ ] Enable airplane mode
- [ ] All screens work: Log, History, Trends, Settings
- [ ] Sync icon shows 🚫 offline
- [ ] Log a reading while offline → saved successfully
- [ ] Pending count increments
- [ ] Sync popover shows correct pending count
- [ ] Disable airplane mode → sync status updates

---

## Sync Status Indicator

- [ ] Icon visible in header of all 4 tabs
- [ ] Icon updates when connectivity changes
- [ ] Tapping icon → popover opens
- [ ] Popover shows: status, last synced time, pending count
- [ ] "Sync Now" disabled when offline
- [ ] "Sync Now" logs intent in Phase 1
- [ ] Popover dismisses on backdrop tap

---

## Accessibility

- [ ] All interactive elements have `accessibilityLabel`
- [ ] All chip buttons have ≥44pt touch target
- [ ] Color contrast meets WCAG AA (4.5:1 normal text, 3:1 large text)
- [ ] `accessibilityRole` set on all interactive elements
- [ ] Screen reader reads elements in logical order

---

## Build

- [ ] `npx react-native run-ios` builds successfully
- [ ] `npx react-native run-android` builds successfully
- [ ] No red errors on blank screen
- [ ] No TypeScript compilation errors (`npx tsc --noEmit`)
