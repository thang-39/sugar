# US-BE-04 — Supabase: Row Level Security (RLS) Policies

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Backend**

## User Story (from PRD)
_(Internal setup — supports US 9, 10, 11, 50, 51.)_

## Goal
Configure Row Level Security (RLS) policies so that:
- In Phase 1: any client can read and write readings (guest mode = local writes only, but RLS is permissive)
- In Phase 5: policies are tightened so users can only access their own data

---

## Context

RLS policies in Supabase control row-level access based on the authenticated user. For Phase 1, the app is fully offline/guest-mode — WatermelonDB is the source of truth locally. The Supabase RLS is set to **permissive** now and will be tightened in Phase 5 when auth is wired up.

---

## Steps

### 1. Enable RLS on Both Tables

```sql
alter table public.readings enable row level security;
alter table public.app_settings enable row level security;
```

### 2. Permissive Policies (Phase 1 — Guest Mode)

```sql
-- ============================================================
-- readings — Phase 1 permissive policies
-- ============================================================

-- Anyone can insert a reading (guest sync queue)
create policy "guest_can_insert_readings"
  on public.readings
  for insert
  with check (true);

-- Anyone can read readings
create policy "anyone_can_read_readings"
  on public.readings
  for select
  using (true);

-- Anyone can update their own readings (by id)
create policy "anyone_can_update_readings"
  on public.readings
  for update
  using (true);

-- Anyone can delete their own readings (by id)
create policy "anyone_can_delete_readings"
  on public.readings
  for delete
  using (true);

-- ============================================================
-- app_settings — Phase 1 permissive policies
-- ============================================================

create policy "anyone_can_read_settings"
  on public.app_settings
  for select
  using (true);

create policy "anyone_can_insert_settings"
  on public.app_settings
  for insert
  with check (true);

create policy "anyone_can_update_settings"
  on public.app_settings
  for update
  using (true);
```

> **Note:** These permissive policies will be replaced with auth-gated policies in Phase 5. The Phase 5 tasks will drop these and add:
> - `auth.uid() = user_id` checks on all policies
> - An `is_owner` check using Supabase service role

---

## Verification

- [ ] RLS is enabled on `public.readings`
- [ ] RLS is enabled on `public.app_settings`
- [ ] All 4 policies exist on `readings` (insert, select, update, delete)
- [ ] All 3 policies exist on `app_settings` (select, insert, update)
- [ ] Anon key can insert a test reading via Supabase REST API (test with curl/Postman)

---

## Dependencies
- **US-BE-02** and **US-BE-03** must be complete first.
