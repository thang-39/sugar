# SUGAR-01-BE-Supabase-Setup

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Backend |
| **User Stories (PRD)** | Supports US-9, US-10, US-11, US-50, US-51 (indirect) |
| **Status** | Not started |

---

## Context

The app needs a backend to eventually sync readings when the user creates an account. In Phase 1-1, the app runs fully offline (guest mode) — all data lives in WatermelonDB locally. But the Supabase project must be set up now so it is ready when Account & Sync is built in Phase 5.

Setting it up early avoids:
- Rushing schema decisions later
- Creating a project mid-development when focus should be on features
- Delaying the FE team who need the Supabase URL and anon key

---

## User Story

> As a **developer/team**, we need a Supabase project configured with the correct settings so that when sync is implemented in Phase 5, the backend infrastructure is already in place and the app can connect to Supabase immediately.

---

## Acceptance Criteria

### AC-1: Supabase project created

- A new Supabase project exists at [supabase.com](https://supabase.com)
- Project is named descriptively (e.g. "Sugar Tracker")
- Project region is selected (no requirement on which region, team decision)

### AC-2: Email/Password auth enabled

- **Authentication** → **Providers** → **Email** is toggled ON
- This is the only auth method needed for Phase 1 (social login deferred to v2)

### AC-3: API credentials obtained and stored

- `SUPABASE_URL` is copied from **Settings** → **API** → **Project URL**
- `SUPABASE_ANON_KEY` is copied from **Settings** → **API** → **Project API keys** → **anon public** key
- Both values are stored in `sugar-tracker/.env` (gitignored)
- `sugar-tracker/.env.example` exists with placeholder values and is committed to git

### AC-4: `.env` file is gitignored

- `.env` appears in `.gitignore`
- No credentials are committed to the repository

### AC-5: Credentials accessible to the app

- Frontend code can read `SUPABASE_URL` and `SUPABASE_ANON_KEY` from environment
- Recommended: stored as `.env` and loaded via React Native's `dotenv` pattern or directly accessed by `@supabase/supabase-js` client

---

## Definition of Done

- [ ] Supabase project is live and accessible
- [ ] `.env` exists locally with real values
- [ ] `.env.example` committed with placeholder format
- [ ] `.env` in `.gitignore`
- [ ] FE team can initialize Supabase client using these credentials

---

## Notes

- No tables, RLS, or API configuration done here — that's the next user stories
- Anon key is safe to expose in mobile app code. Row Level Security (RLS) policies control access.
- If the team has existing Supabase projects, a new one should still be created for this app to keep environments separate