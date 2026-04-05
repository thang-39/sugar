# SUGAR-04-BE-Row-Level-Security-Policies

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Backend |
| **User Stories (PRD)** | Supports US-9, US-10, US-11, US-50, US-51 (indirect — security layer for sync) |
| **Status** | Not started |
| **Blocked by** | SUGAR-02-BE-Database-Schema-Readings, SUGAR-03-BE-Database-Schema-AppSettings |

---

## Context

Row Level Security (RLS) is Supabase's built-in access control layer. It ensures that even if someone has the anon key, they can only access data they are authorized for.

**Phase 1 context:** The app runs in guest mode with no authentication. All writes go to WatermelonDB locally, not to Supabase. However, RLS is enabled now so the foundation is solid. In Phase 5, policies will be tightened with auth checks.

This user story sets up **permissive** policies for Phase 1. These are intentionally open and will be replaced with auth-gated policies in Phase 5.

---

## User Story

> As a **backend system**, I want Row Level Security policies in place on my database tables so that I have a secure foundation that can be tightened when user authentication is added in Phase 5.

---

## Acceptance Criteria

### AC-1: RLS enabled on both tables

- `alter table public.readings enable row level security;`
- `alter table public.app_settings enable row level security;`

### AC-2: Permissive policies for `readings` (Phase 1)

The following 4 policies are created:

| Policy Name | Operation | Behavior |
|---|---|---|
| `guest_can_insert_readings` | INSERT | `with check (true)` — anyone can insert |
| `anyone_can_read_readings` | SELECT | `using (true)` — anyone can read |
| `anyone_can_update_readings` | UPDATE | `using (true)` — anyone can update |
| `anyone_can_delete_readings` | DELETE | `using (true)` — anyone can delete |

### AC-3: Permissive policies for `app_settings` (Phase 1)

The following 3 policies are created:

| Policy Name | Operation | Behavior |
|---|---|---|
| `anyone_can_read_settings` | SELECT | `using (true)` |
| `anyone_can_insert_settings` | INSERT | `with check (true)` |
| `anyone_can_update_settings` | UPDATE | `using (true)` |

### AC-4: Phase 5 migration documented

- A SQL comment or separate note in `docs/SECURITY.md` (or `docs/PHASE5-MIGRATION.md`) documents that these permissive policies must be replaced with auth-gated policies when Phase 5 begins

Example auth-gated policy to add in Phase 5:
```sql
-- Replace "anyone_can_read_readings" with:
create policy "users_can_only_read_own_readings"
  on public.readings for select
  using (auth.uid() = user_id);
```

---

## Definition of Done

- [ ] RLS enabled on `public.readings`
- [ ] RLS enabled on `public.app_settings`
- [ ] All 4 policies exist on `readings`
- [ ] All 3 policies exist on `app_settings`
- [ ] Anon key can insert a test reading via Supabase REST API
- [ ] Migration note for Phase 5 is documented

---

## Notes

- RLS is disabled by default on new Supabase tables — it must be explicitly enabled
- `auth.uid()` is Supabase's auth helper that returns the authenticated user's UUID
- Service role bypasses RLS — never expose service role key to the mobile app