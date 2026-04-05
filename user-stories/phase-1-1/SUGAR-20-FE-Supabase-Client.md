# SUGAR-20-FE-Supabase-Client

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-49, US-50, US-51 (indirect — infrastructure for offline) |
| **Status** | Not started |
| **Blocked by** | SUGAR-06-FE-Project-Scaffold |

---

## Context

The app needs two things from its cloud layer in Phase 1:

1. **A configured Supabase client** — the connection object that will be used when sync is implemented in Phase 5. It must read credentials from environment variables and not crash when the device is offline.

2. **A complete `syncEngine` interface** — defined here so that both SUGAR-20 (the client) and SUGAR-21 (offline detection) share the same contract. This is critical: SUGAR-21 should not invent its own method names. Everything it needs must be declared here as a stub, then implemented later.

> **Important:** In Phase 1, the Supabase client is wired up but **never actually called**. No readings are sent to the cloud. The anon key is present in the app binary but all network calls are stubbed. This is intentional — guest-mode data stays on-device until Phase 5.

---

## User Story

> As a **user**, I want the app to be ready to sync my data to the cloud when I choose to create an account — so my history is backed up and accessible across devices.

> As a **developer**, I want a single, well-defined `syncEngine` interface so that the offline-detection story and the sync-status story both call the same contract — no mismatched method names or missing stubs.

---

## Part 1: Supabase Client

### AC-1: Client initialized

- File: `src/data/supabase/client.ts`
- Uses `createClient` from `@supabase/supabase-js`
- Reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from environment variables
- Exported as `supabase`

### AC-2: Credentials from environment

- URL and anon key are read from `process.env.SUPABASE_URL` and `process.env.SUPABASE_ANON_KEY`
- These values are loaded from `.env` file

### AC-3: Auth session configured

- Client configured with:
  - `persistSession: true` — keeps auth session on disk
  - `autoRefreshToken: true` — auto-refreshes expired tokens

### AC-4: No runtime errors on init

- The client initializes without throwing even if the device is offline
- A network error on init is not a crash — it is handled gracefully

---

## Part 2: SyncEngine Interface

### AC-5: `syncEngine` object with full interface

File: `src/data/supabase/syncEngine.ts`

The object must expose the following methods. All bodies are stubs in Phase 1 (they log or do nothing), but the signatures are complete and stable:

```ts
interface SyncEngine {
  // Lifecycle
  start(): void;
  stop(): void;

  // Connectivity
  isOnline(): boolean;

  // Pending queue
  refreshPendingCount(): void;   // re-queries DB and updates Zustand pendingCount
  getPendingCount(): number;      // synchronous read of current pending count

  // Manual sync
  triggerManualSync(): void;      // in Phase 1: logs and does nothing

  // Status
  getLastSyncedAt(): number | null;

  // Reconnect handler
  onReconnect(callback: () => void): () => void; // returns unsubscribe fn
}
```

**Phase 1 behavior for each method:**

| Method | Phase 1 stub behavior |
|---|---|
| `start()` | Reads current `pendingCount` from DB, updates Zustand |
| `stop()` | No-op |
| `isOnline()` | Returns `true` (stub — real implementation wires to NetInfo) |
| `refreshPendingCount()` | Queries WatermelonDB for `syncStatus === 'pending'` count, calls `setPendingCount` in Zustand |
| `getPendingCount()` | Returns `pendingCount` from Zustand store |
| `triggerManualSync()` | Logs `"[SyncEngine] Manual sync triggered (Phase 5)"` — no network call |
| `getLastSyncedAt()` | Returns `lastSyncedAt` from Zustand store |
| `onReconnect(callback)` | Returns a no-op unsubscribe function in Phase 1 |

> **Note:** The real `isOnline()` wiring to NetInfo and the real reconnect handler belong to **SUGAR-21**. SUGAR-20 provides the stable interface; SUGAR-21 provides the NetInfo wiring.

---

## Definition of Done

- [ ] `src/data/supabase/client.ts` exports `supabase`
- [ ] Client reads credentials from environment variables
- [ ] App starts without crashing even if Supabase is unreachable
- [ ] `syncEngine.ts` exports an object with all 8 methods in the interface above
- [ ] `refreshPendingCount()` correctly queries WatermelonDB and updates Zustand `pendingCount`
- [ ] `triggerManualSync()` logs the Phase 5 message and does not make network calls
- [ ] `onReconnect(callback)` returns a function (even if the body is a no-op)
- [ ] No TypeScript compilation errors

---

## Notes

- In React Native, `process.env` is populated from the `.env` file at build time by some tools, or at runtime by a dotenv loader
- A simple approach: create a `src/config.ts` that exports the values, and import that from `client.ts`
- The anon key is safe to include in the app binary — it is a public key designed for this purpose
- **Never** expose the Supabase **service role** key to the mobile app — that bypasses RLS
- The sync engine interface is the **contract**. SUGAR-21 must import and use this interface, not define its own method signatures
