# SUGAR-21-FE-Offline-Detection

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-49 (offline gracefully), US-50 (reading saved even if sync fails), US-51 (queued for sync) |
| **Status** | Not started |
| **Blocked by** | SUGAR-10-FE-Zustand-Store, SUGAR-12-FE-Repositories, SUGAR-20-FE-Supabase-Client |

---

## Context

The app must work fully offline — logging, viewing history, and trends must all function without internet. When offline, readings are saved locally in WatermelonDB with `syncStatus: 'pending'`. When connectivity returns, they are queued for sync (actual sync happens in Phase 5).

`@react-native-community/netinfo` detects connectivity state changes. This user story wires NetInfo to the Zustand store and the `syncEngine` interface defined in SUGAR-20.

---

## User Story

> As a **user**, I want the app to work completely offline so I can log readings even when I have no internet connection, with no loss of data.

---

## Acceptance Criteria

### AC-1: NetInfo listener wired to sync engine lifecycle

- `syncEngine.start()` is called in `App.tsx` on mount
- `syncEngine.stop()` is called on unmount (cleanup)
- NetInfo listener is created inside `syncEngine.start()` and torn down inside `syncEngine.stop()`
- The unsubscribe function returned by NetInfo's `addEventListener` is called on cleanup

### AC-2: `syncStatus` reflects connectivity

| Connectivity state | `syncStatus` | Meaning |
|---|---|---|
| Offline | `offline` | No internet — readings saved locally only |
| Online + pending readings | `pending` | Internet available, readings waiting to sync |
| Online + no pending | `synced` | Everything is up to date |

When connectivity changes:
1. `isOnline` is updated in the sync engine (via NetInfo)
2. `syncEngine.refreshPendingCount()` is called to recalculate `pendingCount`
3. `syncStatus` is derived from both and written to Zustand

### AC-3: All screens work offline

- Log a reading → saved successfully to WatermelonDB
- History list → loads from local DB
- Trends chart → loads from local DB
- Settings → works (unit toggle is local)

### AC-4: Readings always saved locally first

- The Log screen **always** saves to WatermelonDB first, regardless of connectivity
- Network availability does **not** affect the save action
- After saving: `syncEngine.refreshPendingCount()` is called so `pendingCount` in the Zustand store is accurate

### AC-5: Reconnect behavior

- When NetInfo reports the device is back online, the sync engine calls `syncEngine.refreshPendingCount()` automatically
- This updates `pendingCount` and derives the correct `syncStatus`
- In Phase 5: this will trigger an actual sync. In Phase 1, it only updates the UI indicator.

### AC-6: Graceful degradation

- If NetInfo fails to initialize, the app continues to work normally
- `syncStatus` defaults to `'offline'` (safe default — reads still work locally)
- No crashes on connectivity detection errors

### AC-7: `pendingCount` increments and decrements correctly

- After saving a reading: `pendingCount` increases by 1
- After deleting a reading with `syncStatus === 'pending'`: `pendingCount` decreases by 1
- After deleting a reading with `syncStatus === 'synced'`: `pendingCount` is unchanged

---

## Definition of Done

- [ ] App runs with airplane mode on
- [ ] All screens (Log, History, Trends, Settings) work without internet
- [ ] Saving a reading works offline and marks it as pending
- [ ] Disabling airplane mode → `syncStatus` changes from `offline`
- [ ] `pendingCount` increments after saving
- [ ] `pendingCount` decrements after deleting a pending reading
- [ ] `syncEngine.stop()` cleans up the NetInfo listener without memory leaks
- [ ] Reconnecting triggers `refreshPendingCount()` automatically
- [ ] App does not crash if NetInfo throws on init

---

## Notes

- WatermelonDB writes always succeed offline — the SQLite file is local
- The "pending" queue is simply all readings with `syncStatus === 'pending'`
- `syncEngine.refreshPendingCount()` queries WatermelonDB: `readingsCollection.query(Q.where('sync_status', 'pending')).fetchCount()`
- NetInfo's `addEventListener` returns an unsubscribe function — store it and call it in `syncEngine.stop()` to prevent memory leaks
- `syncEngine.start()` and `syncEngine.stop()` are lifecycle methods — they are called from `App.tsx`
- The `onReconnect(callback)` method on `syncEngine` is how reconnect behavior is registered: `syncEngine.onReconnect(() => syncEngine.refreshPendingCount())`
