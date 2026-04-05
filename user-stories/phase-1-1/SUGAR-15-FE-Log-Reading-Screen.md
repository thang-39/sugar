# SUGAR-15-FE-Log-Reading-Screen

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-1, US-2, US-3, US-4, US-5, US-8, US-43 |
| **Status** | Not started |
| **Blocked by** | SUGAR-10-FE-Zustand-Store, SUGAR-12-FE-Repositories |

---

## Context

The Log Reading screen is the **primary interaction** of the app. A user opens the app and logs their blood sugar. The form must be fast, intuitive, and require minimal taps to complete.

All values are entered in the user's preferred unit and converted to mg/dL before storage.

---

## User Story

> As a **user**, I want to log my blood sugar reading in under a minute with the correct meal context, so that I can record my data without interrupting my day.

---

## Acceptance Criteria

### AC-1: Form fields and smart defaults

| Field | Default | Editable? |
|---|---|---|
| Blood sugar value | empty | Yes — numeric keyboard |
| Unit | `preferredUnit` from Zustand store | Yes — toggle to switch unit |
| Date & Time | current date/time | Yes — via date/time picker |
| Meal type | Breakfast | Yes — selector |
| Before / After | Before | Yes — selector |
| Hours after meal | hidden | Yes — shown only when "After" is selected |
| Notes | collapsed | Yes — expand on tap |

### AC-2: Meal type options

Four options: **Breakfast**, **Lunch**, **Dinner**, **Snack**

### AC-3: Before / After options

Two options: **Before**, **After**

### AC-4: Hours after meal

- Only visible when **After** is selected
- Options: 0h, 1h, 2h, 3h, 4h, 5h, 6h
- Default when "After" is selected: **2h**

### AC-5: Unit toggle

- Visible on the form
- Tapping switches between `mg/dL` and `mmol/L`
- Changing unit clears the value field (user must re-enter — prevents confusion)
- The toggle **does not change stored data** — it only affects how the user enters and sees values

### AC-6: Validation

- Value must be a valid number
- For `mg/dL`: must be a whole number (integer)
- Out of range (< 20 or > 600 mg/dL): **warn-only** — show a confirmation dialog: *"This reading is outside normal ranges (20–600 mg/dL). Save anyway?"*
  - User can choose "Cancel" or "Save"
  - This is not a hard error — the reading is still allowed

### AC-7: Unit conversion before storage

- All values stored in WatermelonDB as **mg/dL**
- If user enters in `mmol/L`: convert using formula `mg/dL = mmol/L ÷ 0.0555`
- Conversion happens at save time, not display time

### AC-8: On save

1. Convert value to mg/dL
2. Validate
3. If out-of-range: show confirmation dialog
4. Create reading in WatermelonDB via `readingRepository.create()`
5. Show success confirmation: *"Your reading has been recorded."*
6. Reset form to defaults (value cleared, time = now, meal type = Breakfast, timing = Before)

### AC-9: `syncStatus` set to `pending`

- Every saved reading is saved with `syncStatus: 'pending'`
- This is handled by `readingRepository.create()`, not by the screen

### AC-10: Accessible

- All inputs have `accessibilityLabel`
- Form is keyboard-navigable
- Error messages are visible to screen readers

---

## Definition of Done

- [ ] All form fields present with correct defaults
- [ ] "After" selected → hours selector appears
- [ ] "Before" selected → hours selector hidden
- [ ] Unit toggle switches and clears value
- [ ] Entering 95 mg/dL → saves without warning
- [ ] Entering 5 mg/dL → warning confirmation appears
- [ ] Save → Alert shown → form resets
- [ ] Saved reading has `syncStatus: 'pending'` in database
- [ ] All fields accessible

---

## Notes

- The PRD specifies "smart defaults: time = now, meal type = Breakfast, mealTiming = Before" — this means the form pre-fills these values on load
- "Warn-only confirmation" means the reading CAN still be saved — it is not blocked
- `DateTimePicker` component: use `@react-native-community/datetimepicker`
