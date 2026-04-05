# SUGAR-19-FE-Settings-Screen

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-43 (unit toggle), US-46 (About screen) |
| **Status** | Not started |
| **Blocked by** | SUGAR-13-FE-Navigation-Setup |

---

## Context

The Settings screen is the hub for app preferences and future account/export features. In Phase 1, it covers the unit toggle (which affects every screen) and placeholder navigation to screens that will be built in later phases.

---

## User Story

> As a **user**, I want to change my preferred unit and find other app features in one place, so that I can manage my preferences easily.

---

## Part 1: Settings Screen

### AC-1: Unit toggle

- Label: "Blood Sugar Unit"
- Shows current unit: e.g. "Currently: mg/dL"
- Tapping opens a selector (inline toggle or alert-style picker) to switch between **mg/dL** and **mmol/L**
- Changing unit **immediately updates all displayed values** throughout the app — no app restart needed
- Preference saved to Zustand store (`setPreferredUnit`)

### AC-2: Navigation rows

Three navigation links (each navigates to a sub-screen):

| Link | Destination | Phase |
|---|---|---|
| Export Data | `ExportScreen` | 6 — placeholder |
| Account | `AccountScreen` | 5 — placeholder |
| About | `AboutScreen` | 1 (this US) |

### AC-3: Unit change reflects everywhere

After changing unit in Settings, verify all these screens update instantly:
- History list (values + unit labels)
- Reading detail (value + unit label)
- Edit reading (unit shown next to value field)
- Trends chart (values on axes and tooltips)

---

## Part 2: About Screen

### AC-4: About screen content

- **App name:** "Blood Sugar Tracker" (or refined team copy)
- **Version number:** shown as "Version 1.0.0" (hardcoded, updated on each release)
- **Medical disclaimer** (formatted as a prominent box):

> *"This app is for personal wellness tracking purposes only. It is not a medical device and has not been evaluated by any regulatory authority. It is not intended to diagnose, treat, cure, or prevent any disease or medical condition. Always consult your healthcare provider before making any medical decisions."*

### AC-5: Version number is manually updated

- Version is **not** read from `package.json` automatically (avoids build complexity)
- When a new version is released, update the constant in `AboutScreen.tsx`

---

## Part 3: Placeholder Screens

### AC-6: Export placeholder

File: `ExportScreen.tsx`
Content: A simple screen with the title "Export Data" and body text: *"Export functionality is coming in a future update."*

### AC-7: Account placeholder

File: `AccountScreen.tsx`
Content: A simple screen with the title "Account" and body text: *"Account management is coming in a future update."*

---

## Definition of Done

- [ ] Unit toggle visible and functional in Settings
- [ ] Changing unit → all screens update instantly without restart
- [ ] Unit preference persists across app restarts
- [ ] "About" screen shows version and medical disclaimer
- [ ] "Export" navigates to placeholder screen
- [ ] "Account" navigates to placeholder screen
- [ ] Navigation works from Settings tab

---

## Notes

- The unit toggle in Settings should be visually consistent with the one on the Log Reading form
- The "export" and "account" rows should look like navigation links (with an arrow indicator →)
- Phase 6 will replace the Export placeholder with a real export screen
- Phase 5 will replace the Account placeholder with a real account management screen
