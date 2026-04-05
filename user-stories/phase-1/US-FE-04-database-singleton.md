# US-FE-04 — Database Singleton

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 10: Data stored only on device (not transmitted)
- US 11: Data persists across app restarts

## Goal
Create the database singleton (`src/data/database/index.ts`) that provides a single, app-wide instance of the WatermelonDB `Database`. This is the single entry point for all database operations.

---

## Steps

### 1. Create Database Singleton

**`src/data/database/index.ts`**

```ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import ReadingModel from './models/ReadingModel';
import AppSettingModel from './models/AppSettingModel';

// ──────────────────────────────────────────────
// SQLite Adapter — JSI enabled for performance
// ──────────────────────────────────────────────
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'SugarTrackerDB',
  jsi: true,       // Enable JSI for faster sync between JS and native
  onSetUpError: error => {
    console.error('[Database] Setup error:', error);
    // In production: log to error tracking service
  },
});

// ──────────────────────────────────────────────
// Database singleton
// ──────────────────────────────────────────────
export const database = new Database({
  adapter,
  modelClasses: [ReadingModel, AppSettingModel],
});

// ──────────────────────────────────────────────
// Convenience exports for each collection
// ──────────────────────────────────────────────
export const readingsCollection = database.get<ReadingModel>('readings');
export const settingsCollection = database.get<AppSettingModel>('app_settings');
```

### 2. Update Shell `index.ts`

Replace the empty shell created in US-FE-02 with the code above.

### 3. Add Type Export

**`src/data/database/models/index.ts`** (new file):

```ts
export { default as ReadingModel } from './ReadingModel';
export { default as AppSettingModel } from './AppSettingModel';
```

---

## Usage Pattern

All components and use cases import from here:

```ts
import { database, readingsCollection, settingsCollection } from '../database';
```

**Never** call `new Database(...)` more than once — always use the exported singleton.

---

## Verification

- [ ] `import { database } from '../database'` resolves without error
- [ ] `database.get('readings')` returns a valid Collection
- [ ] Calling `database.get('readings')` twice returns the same Collection instance (singleton)
- [ ] No crash on app startup with the adapter configured

---

## Dependencies
- **US-FE-03** must be complete first.
