# SUGAR-13-FE-Navigation-Setup

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-30 (History and Trends accessible from main screen), US-47 (onboarding) |
| **Status** | Not started |
| **Blocked by** | SUGAR-10-FE-Zustand-Store, SUGAR-07-FE-Clean-Architecture-Folder-Structure |

---

## Context

The app uses React Navigation with two levels:
1. **Root Stack Navigator** — switches between onboarding and main app
2. **Bottom Tab Navigator** — four main tabs, each with its own **stack navigator** for sub-screens

This structure lets users drill into detail/edit screens while keeping the bottom tabs accessible from anywhere.

---

## User Story

> As a **user**, I want to navigate between the Log, History, Trends, and Settings tabs, and drill into sub-screens (like reading detail and edit) without losing my place in the tab structure.

---

## Acceptance Criteria

### AC-1: Bottom Tab Navigator with 4 tabs

Tabs (left to right):
- **Log** — Log a reading
- **History** — View reading history
- **Trends** — View blood sugar chart
- **Settings** — Preferences and account

Each tab has a **stack navigator** as its component so sub-screens can be pushed on top.

### AC-2: Per-tab stacks defined

| Tab | Stack Screens |
|---|---|
| Log | `LogMain` |
| History | `HistoryList` → `ReadingDetail` → `EditReading` |
| Trends | `TrendsMain` |
| Settings | `SettingsMain` → `ExportData` / `About` / `Account` |

### AC-3: Root Stack switches on onboarding state

```
Root Stack Navigator:
├── OnboardingScreen        (shown when onboardingCompleted === false)
└── MainTabs                (shown when onboardingCompleted === true)
```

- Transition is automatic based on Zustand store value
- After onboarding completes, it is **never shown again**

### AC-4: Screen options

- `headerShown: false` on root navigator
- Each tab stack controls its own header
- Header has a back button on sub-screens (auto-managed by native stack)

### AC-5: Tab bar visible

- Bottom tab bar is always visible when on the main tabs
- Tab bar is hidden when on onboarding screen

### AC-6: Navigation types defined

- TypeScript types for each stack's param list defined in `src/ui/navigation/types.ts`
- All screen components are typed with route params

---

## Definition of Done

- [ ] 4 tabs visible at bottom when in main app
- [ ] Tapping each tab shows its default screen
- [ ] Navigating into History → Detail → Edit works
- [ ] Back button returns to previous screen
- [ ] Completing onboarding → main tabs appear
- [ ] Tab bar hidden on onboarding screen
- [ ] TypeScript navigation types compile without errors

---

## Notes

- **Do not** add a header icon for sync status in this task — that is SUGAR-22 (separate user story)
- The root stack is a `NativeStackNavigator` (not `StackNavigator`) because it has better performance and native animations
- `NavigationContainer` is at the root, not inside any navigator — this is required by React Navigation v6
