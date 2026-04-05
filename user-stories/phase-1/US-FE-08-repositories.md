# US-FE-08 — Repositories

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 1: Log a blood sugar reading
- US 6: Edit a reading
- US 7: Delete a reading
- US 11: Data persists across app restarts

## Goal
Implement the repository layer that abstracts all WatermelonDB operations. All use cases call repositories, never the DB directly. This makes swapping WatermelonDB for a different storage engine in the future easy.

---

## Steps

### 1. Reading Repository

**`src/data/repositories/ReadingRepository.ts`**

```ts
import { Q } from '@nozbe/watermelondb';
import { database, readingsCollection } from '../database';
import ReadingModel from '../database/models/ReadingModel';
import { Reading, ReadingInput } from '../../domain/models/Reading';
import { v4 as uuidv4 } from 'uuid';

function modelToDomain(m: ReadingModel): Reading {
  return {
    id: m.id,
    userId: m.userId,
    value: m.value,
    mealType: m.mealType,
    mealTiming: m.mealTiming,
    hoursAfterMeal: m.hoursAfterMeal,
    notes: m.notes,
    recordedAt: m.recordedAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    syncStatus: m.syncStatus,
  };
}

export class ReadingRepository {
  /** Create a new reading */
  async create(input: ReadingInput, userId: string | null): Promise<Reading> {
    const now = Date.now();
    let created: ReadingModel | null = null;

    await database.write(async () => {
      created = await readingsCollection.create(record => {
        record._raw.id = uuidv4();
        record.userId = userId;
        record.value = input.value;
        record.mealType = input.mealType;
        record.mealTiming = input.mealTiming;
        record.hoursAfterMeal = input.hoursAfterMeal ?? null;
        record.notes = input.notes ?? null;
        record.recordedAt = input.recordedAt;
        record.createdAt = now;
        record.updatedAt = now;
        record.syncStatus = 'pending';
      });
    });

    return modelToDomain(created!);
  }

  /** Update an existing reading */
  async update(id: string, input: Partial<ReadingInput>): Promise<Reading> {
    const record = await readingsCollection.find(id);
    await database.write(async () => {
      await record.update(r => {
        if (input.value !== undefined)        r.value = input.value;
        if (input.mealType !== undefined)      r.mealType = input.mealType;
        if (input.mealTiming !== undefined)    r.mealTiming = input.mealTiming;
        if (input.hoursAfterMeal !== undefined) r.hoursAfterMeal = input.hoursAfterMeal;
        if (input.notes !== undefined)          r.notes = input.notes;
        if (input.recordedAt !== undefined)     r.recordedAt = input.recordedAt;
        r.updatedAt = Date.now();
        r.syncStatus = 'pending';
      });
    });
    return modelToDomain(record);
  }

  /** Delete a reading */
  async delete(id: string): Promise<void> {
    const record = await readingsCollection.find(id);
    await database.write(async () => {
      await record.destroyPermanently();
    });
  }

  /** Get all readings, sorted newest first */
  async getAll(): Promise<Reading[]> {
    const models = await readingsCollection
      .query(Q.sortBy('recorded_at', Q.desc))
      .fetch();
    return models.map(modelToDomain);
  }

  /** Get readings within a date range */
  async getByDateRange(startMs: number, endMs: number): Promise<Reading[]> {
    const models = await readingsCollection
      .query(
        Q.where('recorded_at', Q.gte(startMs)),
        Q.where('recorded_at', Q.lte(endMs)),
        Q.sortBy('recorded_at', Q.desc)
      )
      .fetch();
    return models.map(modelToDomain);
  }

  /** Get all pending readings (for sync queue) */
  async getPending(): Promise<Reading[]> {
    const models = await readingsCollection
      .query(Q.where('sync_status', 'pending'))
      .fetch();
    return models.map(modelToDomain);
  }

  /** Get count of all readings */
  async count(): Promise<number> {
    return readingsCollection.query().fetchCount();
  }
}

export const readingRepository = new ReadingRepository();
```

### 2. App Settings Repository

**`src/data/repositories/AppSettingsRepository.ts`**

```ts
import { Q } from '@nozbe/watermelondb';
import { database, settingsCollection } from '../database';
import AppSettingModel from '../database/models/AppSettingModel';
import { v4 as uuidv4 } from 'uuid';

export class AppSettingsRepository {
  /** Get a setting value by key (null if not set) */
  async get(userId: string | null, key: string): Promise<string | null> {
    const results = await settingsCollection
      .query(
        userId ? Q.where('user_id', userId) : Q.where('user_id', null),
        Q.where('key', key)
      )
      .fetch();

    if (results.length === 0) return null;
    return results[0].value; // JSON-serialized string
  }

  /** Set a setting value */
  async set(userId: string | null, key: string, value: string): Promise<void> {
    const existing = await settingsCollection
      .query(
        userId ? Q.where('user_id', userId) : Q.where('user_id', null),
        Q.where('key', key)
      )
      .fetch();

    await database.write(async () => {
      if (existing.length > 0) {
        // Update
        await existing[0].update(s => {
          s.value = value;
          s.updatedAt = Date.now();
        });
      } else {
        // Create
        await settingsCollection.create(s => {
          s._raw.id = uuidv4();
          s.userId = userId;
          s.key = key;
          s.value = value;
          s.updatedAt = Date.now();
        });
      }
    });
  }

  /** Get and parse a JSON setting */
  async getJson<T>(userId: string | null, key: string): Promise<T | null> {
    const raw = await this.get(userId, key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /** Set a JSON-serialized setting */
  async setJson<T>(userId: string | null, key: string, value: T): Promise<void> {
    await this.set(userId, key, JSON.stringify(value));
  }
}

export const appSettingsRepository = new AppSettingsRepository();
```

### 3. Update Shell Files

Replace empty shells with the code above.

---

## Repository Pattern Benefits

| Benefit | How |
|---|---|
| **Testability** | Repositories can be mocked in unit tests |
| **Swap-ability** | Can replace WatermelonDB with AsyncStorage or MMKV without touching use cases |
| **Single responsibility** | All DB logic lives in one place |

---

## Verification

- [ ] `readingRepository.create(...)` returns a `Reading` with a valid UUID id
- [ ] `readingRepository.getAll()` returns readings sorted newest-first
- [ ] `readingRepository.getByDateRange(...)` returns only readings in the range
- [ ] `readingRepository.delete(id)` removes the reading (verified by calling `getAll()` afterwards)
- [ ] `appSettingsRepository.set('preferredUnit', '"mg/dL"')` persists a value
- [ ] `appSettingsRepository.get('preferredUnit')` retrieves the stored value
- [ ] App restart → data persists (no data loss)

---

## Dependencies
- **US-FE-04** (database singleton) must be complete first.
- **US-FE-06** (domain models) must be complete first.
