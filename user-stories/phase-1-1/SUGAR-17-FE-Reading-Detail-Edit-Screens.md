# SUGAR-17-FE-Reading-Detail-Edit-Screens

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-24 (view detail), US-6 (edit), US-7 (delete) |
| **Status** | Not started |
| **Blocked by** | SUGAR-15-FE-Log-Reading-Screen, SUGAR-16-FE-History-List-Screen |

---

## Context

Users need to be able to view a reading's full details, correct mistakes by editing, and remove accidental entries by deleting. The detail screen is **read-only** — editing happens on a separate screen.

---

## User Story

> As a **user**, I want to view a reading's full details, correct any mistakes, and delete errors so that my history is accurate.

---

## Part 1: Reading Detail Screen

### AC-1: Read-only display of all fields

All fields shown:

| Field | Display format |
|---|---|
| Blood sugar value | Large number + unit label |
| Date & Time | Full formatted date and time |
| Meal type | Plain text |
| Timing | Plain text (e.g. "After · 2 hours after") |
| Notes | Full text if present |
| Sync status | Plain text badge |
| Recorded / Edited | "Recorded [date]" + "(edited [date])" if `updatedAt !== createdAt` |

### AC-2: Edit button

- Header or footer contains an **Edit** button
- Tapping navigates to `EditReadingScreen` with `readingId` route param

### AC-3: Delete button

- Footer contains a **Delete** button (styled differently — e.g. red text or light red background)
- Tapping shows `Alert.confirm`: *"Are you sure you want to delete this reading? This cannot be undone."*
- On confirm → calls `readingRepository.delete(id)` → navigates back to History list

---

## Part 2: Edit Reading Screen

### AC-4: Pre-populated form

- All fields pre-filled from the existing reading
- Stored mg/dL value **converted to user's preferred unit** for display
- `recordedAt` is editable (unlike the Log screen where it defaults to now)

### AC-5: Same validation as Log screen

- Warn-only confirmation for out-of-range values (20–600 mg/dL)
- Value must be a whole number for mg/dL

### AC-6: On save

1. Convert to mg/dL
2. Validate
3. Call `readingRepository.update(id, updates)`
4. `updatedAt` is bumped by the repository
5. `syncStatus` set to `'pending'` (must re-sync after edit)
6. Show success alert: *"Reading updated."*
7. Navigate back to History list

### AC-7: On cancel/back

- No changes saved
- User returns to detail screen

---

## Definition of Done

- [ ] Detail screen shows all fields correctly
- [ ] Values displayed in user's preferred unit
- [ ] "Edited" label shown if reading was edited
- [ ] Edit button → pre-populated form
- [ ] Saving edit → `updatedAt` bumped
- [ ] Delete → confirmation → removed from list
- [ ] Back navigation works correctly
- [ ] All accessible (labels on all buttons)

---

## Notes

- The edit form layout should be visually consistent with the Log screen — same fields, same styling, same behavior
- On the edit form, the "Save" button text should be **"Save Changes"** (not "Save Reading") to differentiate it
- The detail screen fetches the reading by `readingId` from the repository — it is a fresh read, not passed via props
