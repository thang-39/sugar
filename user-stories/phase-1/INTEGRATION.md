# Phase 1 — Integration Checklist

> Run through all items after completing all BE and FE user stories.

## User Flow Tests

### Onboarding
- [ ] Fresh app launch → OnboardingScreen shown
- [ ] Unit picker visible with mg/dL and mmol/L options
- [ ] Disclaimer text visible
- [ ] "Get Started" → saves unit, marks onboarding complete, navigates to Log tab
- [ ] "Skip" → navigates to Log tab with default unit mg/dL
- [ ] Kill and relaunch → onboarding NOT shown again

### Log a Reading
- [ ] Blood sugar value field accepts numeric input
- [ ] Unit toggle switches between mg/dL and mmol/L
- [ ] Date/time picker defaults to now, can be changed
- [ ] Meal type defaults to Breakfast
- [ ] Before/After defaults to Before
- [ ] Selecting "After" → hours selector appears
- [ ] Notes field collapsed by default, expands on tap
- [ ] Entering 95 mg/dL → saves without warning
- [ ] Entering 5 mg/dL → warning confirmation appears
- [ ] Tapping "Save Reading" → Alert shows "Your reading has been recorded"
- [ ] After save → form resets to defaults
- [ ] Saved reading has `syncStatus: 'pending'` in WatermelonDB

### Unit Conversion
- [ ] Log a reading in mg/dL → stored as entered value in DB
- [ ] Log a reading in mmol/L → converted to mg/dL before storing
- [ ] History shows correct value in user's preferred unit
- [ ] Detail screen shows correct value in user's preferred unit
- [ ] Trends chart shows correct value in user's preferred unit

### History List
- [ ] Reading from Log screen appears in History list (newest first)
- [ ] Each row shows: date, time, value, unit, meal chip
- [ ] Reading count shown in header
- [ ] Date range filter → updates list
- [ ] "Clear" filter → shows all readings
- [ ] Count updates when filtered
- [ ] Empty state shown when no readings
- [ ] Tapping a row → navigates to ReadingDetailScreen

### Detail & Edit
- [ ] Detail screen shows all fields correctly
- [ ] "Edit" button → navigates to EditReadingScreen
- [ ] Edit form pre-populated with correct values
- [ ] Editing and saving → Alert "Reading updated" shown
- [ ] `updatedAt` timestamp bumped in DB
- [ ] Navigating back → history list refreshed
- [ ] "Delete" → confirmation dialog appears
- [ ] Confirming delete → reading removed from list

### Trends
- [ ] Chart renders after logging at least one reading
- [ ] Switching time scales (7D / 30D / 90D / All) updates chart
- [ ] Tapping a data point → tooltip shows value and date
- [ ] Empty state shown when no readings
- [ ] New readings appear in chart after logging

### Settings
- [ ] Unit toggle visible in Settings
- [ ] Changing unit → all displayed values update instantly throughout app
- [ ] Unit preference persists across app restarts
- [ ] "About" → shows version and medical disclaimer
- [ ] "Export Data" → placeholder shown
- [ ] "Account" → placeholder shown

### Offline Mode
- [ ] Enable airplane mode
- [ ] All features work (log, history, trends, settings)
- [ ] Sync status icon shows 🚫 offline
- [ ] Save a reading while offline → saved successfully (WatermelonDB)
- [ ] Pending count increments
- [ ] Sync popover shows correct pending count
- [ ] Disable airplane mode → sync status updates

### Data Persistence
- [ ] Kill app and relaunch → all readings present
- [ ] Kill app and relaunch → unit preference preserved
- [ ] Kill app and relaunch → onboarding NOT shown again
- [ ] Kill app and relaunch → date filter state resets (acceptable)

### Accessibility
- [ ] All interactive elements have `accessibilityLabel`
- [ ] All chips have ≥44pt touch target
- [ ] Color contrast meets WCAG AA for all text

---

## Build Verification

- [ ] `npx react-native run-ios` builds successfully
- [ ] `npx react-native run-android` builds successfully
- [ ] No red errors on blank screen before onboarding
- [ ] No red errors after completing onboarding
- [ ] No TypeScript compilation errors (`npx tsc --noEmit`)

---

## Backend Verification

- [ ] Supabase project accessible at project URL
- [ ] `.env` file exists with real credentials
- [ ] `.env` listed in `.gitignore`
- [ ] `.env.example` committed with placeholder values
- [ ] `readings` table exists in Supabase
- [ ] `app_settings` table exists in Supabase
- [ ] RLS enabled on both tables
- [ ] Anon key can insert a test row via REST API
- [ ] `docs/API.md` exists in project root
