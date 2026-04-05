# US-BE-01 — Supabase Project Setup

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Backend**

## User Story (from PRD)
_(Internal setup — no direct user story. Required to support US 9, 10, 11, 50, 51.)_

## Goal
Create and configure a Supabase project so it is ready to accept data when sync is enabled in Phase 5. All credentials are stored in `.env` files (never committed to git).

---

## Steps

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com) → "New Project"
- Name: `blood-sugar-tracker` (or similar)
- Set a strong database password and save it in your password manager
- Choose a region close to your users
- Wait for the project to provision (~2 min)

### 2. Get Credentials
- In Supabase dashboard → **Project Settings** → **API**
- Copy:
  - `SUPABASE_URL` (e.g. `https://xxxxxxxxxxxx.supabase.co`)
  - `SUPABASE_ANON_KEY` (public, safe to expose in mobile app)

### 3. Create `.env` Files

**`sugar-tracker/.env`** (gitignored — real secrets):
```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

**`sugar-tracker/.env.example`** (committed to git — template only):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 4. Enable Email/Password Auth
- In Supabase dashboard → **Authentication** → **Providers** → confirm **Email** is enabled

---

## Verification

- [ ] `.env` file exists with real credentials and is listed in `.gitignore`
- [ ] `.env.example` is committed with placeholder values
- [ ] Supabase project dashboard is accessible at the project URL

---

## Notes
- No tables need to be created in the UI — that is done in US-BE-02 and US-BE-03.
- The anon key is safe to include in the mobile app binary. Row Level Security (RLS) policies control access.
