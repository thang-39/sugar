# US-FE-03 — WatermelonDB Schema & Models

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 9: Use the app without creating an account
- US 10: Data stored only on device
- US 11: Data persists across app restarts

## Goal
Define the WatermelonDB schema and model classes. The schema **must match the Supabase schema exactly** (same column names, types, constraints) so sync works correctly in Phase 5.

---

## Steps

### 1. Define Schema

**`src/data/database/schema.ts`**

```ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'readings',
      columns: [
        // Primary key
        { name: 'id', type: 'string', isPrimaryKey: true },
        // Foreign key to auth.users — null = guest
        { name: 'user_id', type: 'string', isOptional: true },
        // Blood sugar value — always stored in mg/dL
        { name: 'value', type: 'number' },
        // Meal type: Breakfast | Lunch | Dinner | Snack
        { name: 'meal_type', type: 'string' },
        // Before or after meal
        { name: 'meal_timing', type: 'string' },
        // Hours after meal (0–6), null if timing = 'Before'
        { name: 'hours_after_meal', type: 'number', isOptional: true },
        // Free-text notes, max 500 chars
        { name: 'notes', type: 'string', isOptional: true },
        // When the reading was taken (editable by user)
        { name: 'recorded_at', type: 'number' },
        // When the row was first created
        { name: 'created_at', type: 'number' },
        // Bumped on every edit
        { name: 'updated_at', type: 'number' },
        // For sync queue management
        { name: 'sync_status', type: 'string', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'app_settings',
      columns: [
        { name: 'id', type: 'string', isPrimaryKey: true },
        { name: 'user_id', type: 'string', isOptional: true },
        { name: 'key', type: 'string', isIndexed: true },
        { name: 'value', type: 'string' }, // JSON-serialized
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

### 2. Define Reading Model

**`src/data/database/models/ReadingModel.ts`**

```ts
import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly, writer } from '@nozbe/watermelondb/decorators';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type MealTiming = 'Before' | 'After';
export type SyncStatus = 'synced' | 'pending' | 'conflict';

export default class ReadingModel extends Model {
  static table = 'readings';

  @text('user_id') userId!: string | null;
  @field('value') value!: number;           // mg/dL
  @text('meal_type') mealType!: MealType;
  @text('meal_timing') mealTiming!: MealTiming;
  @field('hours_after_meal') hoursAfterMeal!: number | null;
  @text('notes') notes!: string | null;
  @field('recorded_at') recordedAt!: number; // Unix ms
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  @text('sync_status') syncStatus!: SyncStatus;

  @writer async markPending() {
    await this.update(record => {
      record.syncStatus = 'pending';
      record.updatedAt = Date.now();
    });
  }
}
```

### 3. Define AppSetting Model

**`src/data/database/models/AppSettingModel.ts`**

```ts
import { Model } from '@nozbe/watermelondb';
import { field, text } from '@nozbe/watermelondb/decorators';

export default class AppSettingModel extends Model {
  static table = 'app_settings';

  @text('user_id') userId!: string | null;
  @text('key') key!: string;
  @text('value') value!: string; // JSON-serialized
  @field('updated_at') updatedAt!: number;
}
```

### 4. Update Shell Files

Replace the empty shells created in US-FE-02 with the code above.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `id` is a client-generated UUID | Allows offline creation with no server round-trip |
| Values stored as `number` | WatermelonDB uses JS numbers; Supabase uses `bigint` for timestamps |
| Timestamps stored as Unix ms numbers | Consistent across platforms, no timezone issues |
| `syncStatus` indexed | Fast queries for the sync queue (`WHERE sync_status = 'pending'`) |

---

## Verification

- [ ] Schema has exactly the 11 columns listed in the PRD data model
- [ ] `ReadingModel` and `AppSettingModel` extend `Model` from WatermelonDB
- [ ] All decorators (`@field`, `@text`) used correctly
- [ ] Schema version is `1`
- [ ] Unit test: create a `ReadingModel` instance in memory and verify all fields are set correctly

---

## Dependencies
- **US-FE-02** must be complete first.
