# SUGAR-09-FE-Database-Singleton

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-9, US-10, US-11 (data persistence) |
| **Status** | Not started |
| **Blocked by** | SUGAR-08-FE-WatermelonDB-Schema-Models |

---

## Context

The app needs exactly **one** instance of the WatermelonDB `Database` object. Creating multiple instances would cause unpredictable behavior and resource waste.

This user story creates the singleton and exports convenient references to each collection so all repositories and use cases import from the same place.

---

## User Story

> As a **user**, I want my data to always be read from and written to the same place on my phone — so the app is fast and my data is never split across multiple storage locations.

---

## Acceptance Criteria

### AC-1: Database singleton created

- File: `src/data/database/index.ts`
- Exports a single `database: Database` instance
- Uses `SQLiteAdapter` with JSI enabled (`jsi: true`) for performance
- Adapter configured with: `dbName: 'SugarTrackerDB'`, schema, JSI

### AC-2: Collection exports

The singleton exports convenience references:

```ts
export const readingsCollection = database.get<ReadingModel>('readings');
export const settingsCollection = database.get<AppSettingModel>('app_settings');
```

This avoids calling `.get()` repeatedly throughout the codebase.

### AC-3: Model class exports

- `src/data/database/models/index.ts` exports both model classes:
  - `ReadingModel`
  - `AppSettingModel`

### AC-4: Error handling

- `onSetUpError` callback logs errors to console
- In production, this would connect to an error tracking service

### AC-5: Single instance enforced

- The `Database` constructor is called exactly once
- No other file calls `new Database(...)`
- Comment in the file documents this constraint

---

## Definition of Done

- [ ] `src/data/database/index.ts` exports `database`
- [ ] `database.get('readings')` returns a valid WatermelonDB `Collection`
- [ ] Calling `.get()` twice returns the same `Collection` instance
- [ ] App starts without crashing when WatermelonDB is initialized
- [ ] `models/index.ts` exports both model classes
- [ ] No other file creates a `new Database(...)` instance

---

## Notes

- JSI (JavaScript Interface) allows WatermelonDB to bypass the React Native bridge for faster database operations — it should be enabled when possible
- If JSI fails on Android emulators (some older versions), it gracefully falls back — this is expected behavior
- The singleton pattern here is the React Native equivalent of a dependency injection container
