# US-FE-16 — Offline Detection & Sync Engine Stub

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 49: Handle offline mode gracefully
- US 50: A reading saved locally even if sync fails
- US 51: Reading queued for sync when offline, synced when connectivity returns

## Goal
Wire up `@react-native-community/netinfo` to detect online/offline state transitions and update the Zustand store's `syncStatus`. In Phase 1, this is a stub — no actual sync to Supabase happens yet. The sync engine is fully wired and ready to activate in Phase 5.

---

## Steps

### 1. Create Supabase Client

**`src/data/supabase/client.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

### 2. Create Sync Engine

**`src/data/supabase/syncEngine.ts`**

```ts
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppStore } from '../stores/useAppStore';
import { readingRepository } from '../repositories/ReadingRepository';

/**
 * SyncEngine — Phase 1 stub
 *
 * Responsibilities:
 * - Detect online/offline state transitions
 * - Update Zustand syncStatus
 * - Queue readings as `pending` (already done on save)
 * - Log sync intent (Phase 5 will implement actual sync)
 */
class SyncEngine {
  private unsubscribe: (() => void) | null = null;

  /** Start listening to network state */
  start() {
    if (this.unsubscribe) return; // already started

    this.unsubscribe = NetInfo.addEventListener(this.handleConnectivityChange);

    // Also check initial state
    NetInfo.fetch().then(this.handleConnectivityChange);
  }

  /** Stop listening */
  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private handleConnectivityChange = async (state: NetInfoState) => {
    const store = useAppStore.getState();
    const isConnected = state.isConnected ?? false;

    if (!isConnected) {
      // Offline
      store.setSyncStatus('offline');
      console.log('[SyncEngine] Went offline');
      return;
    }

    // Online
    const pending = await readingRepository.getPending();
    const pendingCount = pending.length;

    // Check if we should auto-sync (>24h since last sync)
    const lastSynced = store.lastSyncedAt;
    const MS_24H = 24 * 60 * 60 * 1000;
    const shouldAutoSync = lastSynced === null || (Date.now() - lastSynced) > MS_24H;

    if (pendingCount > 0) {
      store.setSyncStatus('pending');
    } else {
      store.setSyncStatus('synced');
    }

    if (shouldAutoSync && pendingCount > 0) {
      // Phase 1: just log intent. Phase 5 implements actual sync.
      console.log(`[SyncEngine] Online — ${pendingCount} pending readings. Would trigger sync now (Phase 5).`);
      // TODO Phase 5: await this.runSync();
    } else {
      console.log(`[SyncEngine] Online — ${pendingCount} pending readings. No auto-sync needed.`);
    }
  };

  /** Manual sync trigger — called from sync status popover */
  async triggerManualSync(): Promise<void> {
    const store = useAppStore.getState();

    if (store.syncStatus === 'offline') {
      console.log('[SyncEngine] Manual sync skipped — offline');
      return;
    }

    store.setSyncStatus('syncing');

    try {
      // Phase 1 stub: just mark as synced
      // Phase 5: implement actual Supabase sync here
      await new Promise(resolve => setTimeout(resolve, 500)); // simulate network

      const pending = await readingRepository.getPending();
      console.log(`[SyncEngine] Manual sync complete. ${pending.length} readings synced.`);

      store.setSyncStatus('synced');
      store.setLastSyncedAt(Date.now());
      store.setPendingCount(0);
    } catch (err) {
      console.error('[SyncEngine] Sync failed:', err);
      store.setSyncStatus('offline');
    }
  }

  /** Re-count pending readings (called after save/delete) */
  async refreshPendingCount(): Promise<void> {
    const pending = await readingRepository.getPending();
    useAppStore.getState().setPendingCount(pending.length);
  }
}

export const syncEngine = new SyncEngine();
```

### 3. Wire Sync Engine Into App Entry Point

**`App.tsx`**

```tsx
import React, { useEffect } from 'react';
import AppNavigator from './src/ui/navigation/AppNavigator';
import { syncEngine } from './src/data/supabase/syncEngine';
import { useAppStore } from './src/data/stores/useAppStore';

export default function App() {
  useEffect(() => {
    // Start sync engine
    syncEngine.start();

    // Refresh pending count on startup
    syncEngine.refreshPendingCount();

    return () => {
      syncEngine.stop();
    };
  }, []);

  return <AppNavigator />;
}
```

### 4. Update LogReadingScreen

After saving, call `syncEngine.refreshPendingCount()`:

```ts
import { syncEngine } from '../../data/supabase/syncEngine';

// In handleSave, after successful save:
await syncEngine.refreshPendingCount();
```

---

## Behavior Summary

| Event | Phase 1 Behavior | Phase 5 Behavior |
|---|---|---|
| App starts | `syncStatus` set based on connectivity | Same |
| Goes offline | `syncStatus = 'offline'` | Same |
| Comes online | `syncStatus = 'synced'` or `'pending'` | Triggers auto-sync if >24h |
| Reading saved | Always saved locally first | Same + marked pending |
| Manual sync | Logs intent, marks synced | Actually syncs to Supabase |
| Sync fails | `syncStatus = 'offline'` | Retry logic + toast |

---

## Verification

- [ ] App starts with `syncStatus` reflecting current connectivity
- [ ] Airplane mode → `syncStatus = 'offline'`
- [ ] Disabling airplane mode → `syncStatus` changes to `synced` or `pending`
- [ ] Saving a reading while offline → it is saved locally (WatermelonDB)
- [ ] Pending count is accurate after save/delete
- [ ] App restart → `pendingCount` is recalculated from DB

---

## Dependencies
- **US-FE-08** (repositories with `getPending`) must be complete first.
- **US-FE-05** (Zustand store with sync fields) must be complete first.
