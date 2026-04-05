# SUGAR-12-FE-Repositories

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-1 (create), US-6 (edit), US-7 (delete), US-11 (persist), US-23 (filter) |
| **Status** | Not started |
| **Blocked by** | SUGAR-09-FE-Database-Singleton, SUGAR-11-FE-Domain-Layer-UseCases |

---

## Context

The repository pattern is the **bridge** between the domain layer (business logic) and the data layer (WatermelonDB). Every use case calls a repository — never the database directly. This makes it easy to:
- Write unit tests (mock the repository)
- Change the storage engine (e.g., swap WatermelonDB for MMKV) without touching business logic
- Keep database queries in one predictable place

---

## User Story

> As a **user**, I want my readings to be saved, edited, and deleted reliably — so my history is always accurate and up to date.

> As a **developer**, I want data access to go through a single, well-defined interface so the business logic never depends on the database directly.

---

## Acceptance Criteria

### AC-1: `ReadingRepository` implemented

**File:** `src/data/repositories/ReadingRepository.ts`

Methods:

| Method | Signature | Behavior |
|---|---|---|
| `create` | `(input: ReadingInput, userId: string \| null) => Promise<Reading>` | Writes to WatermelonDB, returns domain object |
| `update` | `(id: string, updates: Partial<ReadingInput>) => Promise<Reading>` | Finds record, applies updates, bumps `updatedAt`, sets `syncStatus: 'pending'` |
| `delete` | `(id: string) => Promise<void>` | Finds and permanently deletes record |
| `getAll` | `() => Promise<Reading[]>` | Returns all readings, sorted newest first (`recordedAt` DESC) |
| `getByDateRange` | `(startMs: number, endMs: number) => Promise<Reading[]>` | Returns filtered readings, sorted newest first |
| `getPending` | `() => Promise<Reading[]>` | Returns all readings with `syncStatus === 'pending'` |
| `count` | `() => Promise<number>` | Returns total count of all readings |

### AC-2: `AppSettingsRepository` implemented

**File:** `src/data/repositories/AppSettingsRepository.ts`

Methods:

| Method | Signature | Behavior |
|---|---|---|
| `get` | `(userId: string \| null, key: string) => Promise<string \| null>` | Returns raw JSON-serialized value or `null` |
| `set` | `(userId: string \| null, key: string, value: string) => Promise<void>` | Upsert — updates existing or creates new |
| `getJson<T>` | `(userId: string \| null, key: string) => Promise<T \| null>` | Gets and parses JSON value |
| `setJson<T>` | `(userId: string \| null, key: string, value: T) => Promise<void>` | Serializes and sets JSON value |

### AC-3: Model-to-domain conversion

- `ReadingModel` (WatermelonDB) is converted to `Reading` (domain interface) before being returned from any repository method
- No WatermelonDB model objects leak outside the data layer

### AC-4: Write transactions used

- `create`, `update`, `delete` operations run inside `database.write(async () => { ... })`
- Read operations are outside transactions (reads are always consistent in WatermelonDB)

### AC-5: Client-generated UUIDs

- New readings get a client-generated UUID (using `uuid` package), not a server-generated one
- WatermelonDB's `_raw.id` is set to the UUID before creation

---

## Definition of Done

- [ ] `ReadingRepository` has all 7 methods
- [ ] `AppSettingsRepository` has all 4 methods
- [ ] `create` saves a reading and returns a valid domain object
- [ ] `update` applies partial updates correctly
- [ ] `delete` removes the record permanently
- [ ] `getAll` returns readings sorted newest first
- [ ] `getByDateRange` returns only in-range readings
- [ ] `getPending` returns only `pending` readings
- [ ] No WatermelonDB models escape the repository layer
- [ ] All writes use `database.write()`

---

## Notes

- A singleton instance of each repository is exported: `export const readingRepository = new ReadingRepository()`
- This avoids needing a dependency injection framework
- Repository methods return `Promise<>` — they are all async
- `appSettingsRepository.setJson()` is the recommended way to save settings (it handles JSON serialization automatically)
