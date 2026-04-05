# SUGAR-16-FE-History-List-Screen

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-21, US-22, US-23, US-25, US-26 |
| **Status** | Not started |
| **Blocked by** | SUGAR-15-FE-Log-Reading-Screen |

---

## Context

The History screen shows every reading in reverse chronological order. It is where users review past data. The screen must load fast, be filterable, and make it easy to drill into a specific reading's details.

---

## User Story

> As a **user**, I want to see all my blood sugar readings in a simple list, sorted newest first, so that I can quickly review my history and spot patterns.

---

## Acceptance Criteria

### AC-1: List displays all readings

- FlatList showing all readings from WatermelonDB
- Sorted **newest first** by `recordedAt` (DESC)
- One reading per row

### AC-2: Each row shows

- **Blood sugar value** — in the user's preferred unit + unit label (e.g. "120 mg/dL")
- **Date and time** — formatted (e.g. "Apr 5, 2026 · 2:30 PM")
- **Meal context chip** — e.g. "Breakfast · After · 2h" or "Lunch · Before"
- **Notes preview** — if present, show first line truncated to 1 line

### AC-3: Reading count displayed

- Header shows: `"X readings"` when showing all
- When filtered: `"X of Y readings"` (e.g. "5 of 23 readings")

### AC-4: Date range filter

- **From** date picker button
- **To** date picker button
- When "To" date is selected → filter is applied
- **"Clear"** button appears when a filter is active — tapping it removes the filter
- Filter state: none → all readings shown

### AC-5: Empty state

- When no readings exist: show a friendly empty state
- Message: *"No readings yet. Start logging to see your history here."*
- Optional: an icon (📋 or similar)

### AC-6: Tap to detail

- Tapping a reading row navigates to `ReadingDetailScreen` with `readingId` as a route param
- The entire row is tappable (not just a small icon)

### AC-7: Reactive to new readings

- List refreshes when returning from the Log screen
- Newest reading appears at top immediately after saving

---

## Definition of Done

- [ ] All readings listed, sorted newest first
- [ ] Each row shows value, unit, date/time, meal chip
- [ ] Notes preview shown if present
- [ ] Reading count accurate
- [ ] Date filter works and updates list
- [ ] "Clear" removes filter
- [ ] Tapping row navigates to detail screen
- [ ] Empty state shown when no readings
- [ ] New readings appear at top after logging

---

## Notes

- Use React's `useCallback` for the load function to avoid unnecessary re-fetches
- The FlatList should use `keyExtractor` on `reading.id`
- Date formatting should use `src/utils/dateUtils.ts` for consistency
- `accessibilityLabel` on each row should include the value and date for screen reader users