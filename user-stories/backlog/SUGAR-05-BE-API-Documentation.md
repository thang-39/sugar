# SUGAR-05-BE-API-Documentation

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Backend |
| **User Stories (PRD)** | Supports all sync-related US (indirect) |
| **Status** | Not started |
| **Blocked by** | SUGAR-02-BE-Database-Schema-Readings, SUGAR-03-BE-Database-Schema-AppSettings |

---

## Context

The frontend team needs to know the exact shape of data to send to and receive from Supabase before they start building the sync engine. API documentation prevents misalignment between FE and BE, especially important when BE tasks are completed before FE sync tasks are built.

This user story creates `docs/API.md` — a living reference document.

---

## User Story

> As a **frontend developer**, I want a clear API reference document so that I know exactly what endpoints to call, what data to send, and how to handle sync responses when I build the sync engine in Phase 5.

---

## Acceptance Criteria

### AC-1: `docs/API.md` created in project root

- File path: `sugar-tracker/docs/API.md`
- Committed to git (not gitignored)

### AC-2: `readings` table endpoints documented

For each endpoint, the doc includes: HTTP method, URL path, required headers, request body schema, and response code.

| Endpoint | Method | Purpose |
|---|---|---|
| `/rest/v1/readings` | POST | Upsert a reading |
| `/rest/v1/readings?user_id=eq.{id}` | GET | Fetch all readings for a user |
| `/rest/v1/readings?id=eq.{id}` | PATCH | Update a reading |
| `/rest/v1/readings?id=eq.{id}` | DELETE | Delete a reading |

### AC-3: `app_settings` endpoints documented

| Endpoint | Method | Purpose |
|---|---|---|
| `/rest/v1/app_settings?user_id=eq.{id}&key=eq.{key}` | GET | Fetch a setting |
| `/rest/v1/app_settings` | POST | Upsert a setting |
| `/rest/v1/app_settings?user_id=eq.{id}&key=eq.{key}` | PATCH | Update a setting |

### AC-4: Authentication header documented

- All requests include: `apikey: <SUPABASE_ANON_KEY>` and `Content-Type: application/json`
- This is clearly shown at the top of the document

### AC-5: Sync flow documented

A section explains the Phase 5 sync sequence:

1. Client sends all `sync_status = 'pending'` readings via POST
2. Server returns canonical versions
3. Client updates local `id` and `sync_status = 'synced'`
4. Client fetches remote readings
5. Client merges with local (server-wins on conflicts)

### AC-6: Conflict resolution documented

- 60-second duplicate detection window explained
- Server-wins strategy described clearly
- Post-sync informational toast behavior described

---

## Definition of Done

- [ ] `docs/API.md` exists at project root
- [ ] All `readings` CRUD endpoints documented with request/response shapes
- [ ] All `app_settings` endpoints documented
- [ ] Auth headers documented
- [ ] Sync flow documented
- [ ] Conflict resolution documented
- [ ] File committed to git

---

## Notes

- Supabase REST API is auto-generated from the PostgreSQL schema — this document describes what already exists, not a custom API
- The `POST` to `/rest/v1/readings` with an existing `id` acts as an upsert — this should be clearly noted