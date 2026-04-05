# US-BE-05 — API Documentation

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Backend**

## User Story (from PRD)
_(Internal documentation — supports all sync-related user stories.)_

## Goal
Document the expected Supabase REST API shape so the frontend team knows exactly what endpoints to call when the sync engine is built in Phase 5.

---

## Steps

### 1. Create the Docs File

Create `docs/API.md` in the project root (next to `PRD.md`):

```markdown
# Blood Sugar Tracker — API Reference

> **Base URL:** `https://<project>.supabase.co/rest/v1/`
> **Auth:** `apikey: <SUPABASE_ANON_KEY>` header on all requests
> **Content-Type:** `application/json`

---

## Tables

### `readings`

#### `POST /readings` — Upsert a reading

**Request body:**
```json
{
  "id": "client-generated-uuid",
  "user_id": "uuid-or-null",
  "value": 120,
  "meal_type": "Breakfast",
  "meal_timing": "Before",
  "hours_after_meal": null,
  "notes": "Felt fine",
  "recorded_at": 1712345678000,
  "created_at": 1712345678000,
  "updated_at": 1712345678000,
  "sync_status": "pending"
}
```

**Response:** `201 Created` or `200 OK`

---

#### `GET /readings?user_id=eq.<uuid>` — Fetch all readings for a user

**Query params:**
- `user_id=eq.<uuid>` — filter by user (null for guest)
- `order=recorded_at.desc` — newest first
- `sync_status=eq.pending` — only pending (for sync queue)

**Response:** JSON array of reading objects

---

#### `PATCH /readings?id=eq.<uuid>` — Update a reading

**Request body (partial):**
```json
{
  "value": 130,
  "updated_at": 1712349999000,
  "sync_status": "pending"
}
```

**Response:** `200 OK`

---

#### `DELETE /readings?id=eq.<uuid>` — Delete a reading

**Response:** `204 No Content`

---

### `app_settings`

#### `GET /app_settings?user_id=eq.<uuid>&key=eq.preferredUnit`

Fetch a single setting for a user.

**Response:** JSON array (0 or 1 item)

---

#### `POST /app_settings` — Upsert a setting

```json
{
  "user_id": "uuid-or-null",
  "key": "preferredUnit",
  "value": "\"mg/dL\"",
  "updated_at": 1712345678000
}
```

> Note: `value` is JSON-serialized (string inside quotes).

**On conflict (unique constraint):** use `on_conflict=user_id,key` or handle via PATCH.

---

#### `PATCH /app_settings?user_id=eq.<uuid>&key=eq.preferredUnit`

Update an existing setting.

---

## Conflict / Deduplication

- **Duplicate detection window:** 60 seconds
  - Same `user_id` + `recorded_at` within 60s → server row wins
  - Enforced in the sync engine, not at DB level
- **Conflict resolution:** server-wins
  - After sync, client receives server's version
  - Toast: "N duplicate readings merged"

## Sync Flow (Phase 5)

1. Client sends all `sync_status = 'pending'` readings via `POST /readings`
2. Server responds with canonical versions (server-assigned ids, server timestamps)
3. Client updates local `id`, `sync_status = 'synced'`
4. Client fetches remote readings via `GET /readings?user_id=eq.<uuid>`
5. Client merges with local, applying server-wins on conflicts
```

### 2. Commit the File

```bash
git add docs/API.md
git commit -m "docs: add Supabase REST API reference"
```

---

## Verification

- [ ] `docs/API.md` exists in the project root
- [ ] All CRUD operations documented for both `readings` and `app_settings`
- [ ] Sync flow and conflict resolution strategy documented
- [ ] File is committed to git

---

## Dependencies
- **US-BE-02**, **US-BE-03**, **US-BE-04** should be complete first (so the docs reflect reality).
