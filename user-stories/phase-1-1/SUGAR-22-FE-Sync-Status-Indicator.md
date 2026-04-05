# SUGAR-22-FE-Sync-Status-Indicator

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-19 (sync status indicator) |
| **Status** | Not started |
| **Blocked by** | SUGAR-21-FE-Offline-Detection |

---

## Context

Users need to know whether their data is synced to the cloud. The sync status indicator is a small icon in the header of each tab that communicates the current state. Tapping it opens a popover with more detail.

This is purely a **display** component — it reads from the Zustand store. The actual sync logic lives in SUGAR-21.

---

## User Story

> As a **user**, I want to see at a glance whether my readings are synced to the cloud, so I know my data is safe.

---

## Acceptance Criteria

### AC-1: Sync status icon in each tab header

- A small icon appears in the header of all four tabs (Log, History, Trends, Settings)
- Icon position: top-right corner of the header
- Four states with distinct icons:

| `syncStatus` | Icon | Color |
|---|---|---|
| `synced` | ✓ | Green |
| `syncing` | 🔄 | Blue |
| `pending` | ⏳ | Orange |
| `offline` | 🚫 | Gray |

### AC-2: Popover on tap

- Tapping the icon opens a modal/popover with:

| Field | Value shown |
|---|---|
| Status | Current status label (e.g. "Synced") |
| Last synced | Formatted date/time, or "Never" if never synced |
| Pending | Number of pending readings + "reading(s)" |
| Sync Now button | Calls `syncEngine.triggerManualSync()` |

### AC-3: Sync Now button behavior

- Enabled when `syncStatus` is `synced` or `pending`
- Disabled (grayed out) when `syncStatus` is `offline`
- In Phase 1: calls the stub method, logs to console
- In Phase 5: actually syncs to Supabase

### AC-4: Popover dismissed on backdrop tap

- Tapping outside the popover dismisses it
- Close button also dismisses it

### AC-5: Offline message

- When `syncStatus === 'offline'`, the popover shows:
  *"Sync not available while offline. Your readings are saved locally."*

### AC-6: Accessible

- Icon has `accessibilityLabel` describing current status: e.g. "Sync status: 3 pending readings. Tap for details."
- Modal has a close button

---

## Definition of Done

- [ ] Icon visible in header of all 4 tabs
- [ ] Icon updates when `syncStatus` changes in Zustand
- [ ] Tapping icon opens popover
- [ ] Popover shows correct status, last synced time, pending count
- [ ] "Sync Now" disabled when offline
- [ ] Popover dismisses on backdrop tap
- [ ] Offline message shown when offline
- [ ] Screen reader can access the icon and popover

---

## Notes

- The icon should be small and subtle — it is an indicator, not the main focus of any screen
- Implement with React Native's built-in `Modal` component (no extra dependencies)
- The icon uses Unicode emoji for Phase 1 — this is acceptable as the PRD uses the same emoji. In a later phase, these could be replaced with vector icons
- The popover should be centered on the screen (not anchored to the header) for simplicity
