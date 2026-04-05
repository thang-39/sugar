# SUGAR-07-FE-Clean-Architecture-Folder-Structure

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | Supports all (establishes the architecture) |
| **Status** | Not started |
| **Blocked by** | SUGAR-06-FE-Project-Scaffold |

---

## Context

The app follows **Clean Architecture** with three layers:
1. **UI Layer** — React components, screens, navigation
2. **Domain Layer** — Pure business logic (use cases), models, no framework dependencies
3. **Data Layer** — Repositories, WatermelonDB, Supabase client, Zustand store

Separating these layers means business logic is testable without needing a running app, and the database layer can be swapped without touching the UI.

This user story creates the folder structure and minimal shell files so every future file has a clear, consistent home.

---

## User Story

> As a **development team**, I want a consistent folder structure with clear ownership of each layer so that every developer knows exactly where to put new code and where to find existing code.

> As a **user**, I want the app's features to be reliable and consistent — so that when I log a reading, the value is stored correctly and shows up in my history every time.

---

## Acceptance Criteria

### AC-1: Folder structure created

```
sugar-tracker/
└── src/
    ├── ui/
    │   ├── screens/          # One file per screen
    │   ├── components/       # Reusable UI components
    │   ├── navigation/       # Navigation setup
    │   └── theme/            # Colors, typography, spacing
    ├── domain/
    │   ├── models/           # Plain TypeScript interfaces
    │   └── useCases/         # Pure business logic functions
    ├── data/
    │   ├── database/         # WatermelonDB schema, models, singleton
    │   │   └── models/       # WatermelonDB @model classes
    │   ├── repositories/     # Repository pattern implementations
    │   ├── supabase/         # Supabase client + sync engine
    │   └── stores/           # Zustand store
    └── utils/                # Pure utility functions
docs/
└── API.md
```

### AC-2: All files have shell exports

Every `.ts` and `.tsx` file has a minimal export so imports resolve immediately:

- `src/domain/models/Reading.ts` → exports an empty `interface Reading`
- `src/ui/screens/LogReadingScreen.tsx` → exports an empty functional component
- All other files follow the same pattern

This prevents broken imports when developers start building features.

### AC-3: Theme file created

- `src/ui/theme/index.ts` exports:
  - `colors` — primary, background, surface, text, textSecondary, border, error, warning, success
  - `spacing` — xs, sm, md, lg, xl

### AC-4: Utility files created

- `src/utils/dateUtils.ts` — `formatDate()`, `formatTime()`, `formatDateTime()`, `startOfToday()`, `daysAgo()`, `monthsAgo()`
- `src/utils/unitConversion.ts` — `mgdlToMmoll()`, `mmollToMgdl()`, `toDisplayValue()`, `fromDisplayValue()`

### AC-5: `App.tsx` wired to navigation

- `App.tsx` imports and renders `AppNavigator`
- No business logic in `App.tsx`

---

## Definition of Done

- [ ] All folders created with correct hierarchy
- [ ] All `.ts` / `.tsx` files exist with at least a minimal export
- [ ] Importing `AppNavigator` from `src/ui/navigation` resolves without error
- [ ] Theme colors and spacing constants are exported
- [ ] Date utilities are exported
- [ ] Unit conversion utilities are exported
- [ ] `App.tsx` renders the navigator

---

## Notes

- Shell files should be **minimal** — just enough to compile. Actual implementation goes in later user stories.
- The domain layer has **no imports** from React, WatermelonDB, or Supabase — this is enforced by keeping it in its own folder
- `utils/` is intentionally shared across all layers — it contains no business logic, just pure functions
