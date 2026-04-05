# US-FE-05 — Zustand Store

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 43: Choose preferred blood sugar unit
- US 47: Brief onboarding flow
- US 48: Skip onboarding and go straight to guest mode

## Goal
Create a single Zustand store persisted to AsyncStorage. It holds all app-wide state: auth status, user preferences, and sync metadata.

---

## Steps

### 1. Create the Store

**`src/data/stores/useAppStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export type PreferredUnit = 'mg/dL' | 'mmol/L';
export type SyncStatusType = 'synced' | 'syncing' | 'pending' | 'offline';

interface AppState {
  // ── Auth ──────────────────────────────────
  userId: string | null;     // null = guest mode
  isLoggedIn: boolean;

  // ── Preferences ────────────────────────────
  preferredUnit: PreferredUnit;
  onboardingCompleted: boolean;

  // ── Sync ──────────────────────────────────
  syncStatus: SyncStatusType;
  pendingCount: number;
  lastSyncedAt: number | null;  // Unix ms timestamp

  // ── Actions ────────────────────────────────
  setPreferredUnit: (unit: PreferredUnit) => void;
  completeOnboarding: () => void;
  setUserId: (userId: string | null) => void;
  login: (userId: string) => void;
  logout: () => void;
  setSyncStatus: (status: SyncStatusType) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (timestamp: number | null) => void;
}

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ── Initial state ───────────────────────
      userId: null,
      isLoggedIn: false,
      preferredUnit: 'mg/dL',
      onboardingCompleted: false,
      syncStatus: 'offline',
      pendingCount: 0,
      lastSyncedAt: null,

      // ── Actions ─────────────────────────────
      setPreferredUnit: (unit) =>
        set({ preferredUnit: unit }),

      completeOnboarding: () =>
        set({ onboardingCompleted: true }),

      setUserId: (userId) =>
        set({ userId, isLoggedIn: userId !== null }),

      login: (userId) =>
        set({ userId, isLoggedIn: true }),

      logout: () =>
        set({ userId: null, isLoggedIn: false }),

      setSyncStatus: (status) =>
        set({ syncStatus: status }),

      setPendingCount: (count) =>
        set({ pendingCount: count }),

      setLastSyncedAt: (timestamp) =>
        set({ lastSyncedAt: timestamp }),
    }),
    {
      name: '@sugar/appStore',         // AsyncStorage key
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these keys:
      partialize: (state) => ({
        userId: state.userId,
        isLoggedIn: state.isLoggedIn,
        preferredUnit: state.preferredUnit,
        onboardingCompleted: state.onboardingCompleted,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
```

### 2. Update Shell `useAppStore.ts`

Replace the empty shell with the code above.

### 3. Add a Selector Hook

Add this at the bottom of `useAppStore.ts` for convenient access:

```ts
// ──────────────────────────────────────────────
// Selectors (for optimized re-renders)
// ──────────────────────────────────────────────
export const usePreferredUnit = () => useAppStore(s => s.preferredUnit);
export const useOnboardingCompleted = () => useAppStore(s => s.onboardingCompleted);
export const useSyncStatus = () => useAppStore(s => s.syncStatus);
export const useIsLoggedIn = () => useAppStore(s => s.isLoggedIn);
```

---

## Persisted vs. In-Memory

| Key | Persisted? | Reason |
|---|---|---|
| `preferredUnit` | ✅ Yes | Must survive app restarts |
| `onboardingCompleted` | ✅ Yes | Don't show onboarding again |
| `userId` | ✅ Yes | Know if logged in after restart |
| `syncStatus` | ❌ No | Derived from network state, not persisted |
| `pendingCount` | ❌ No | Recalculated from DB on app start |

---

## Verification

- [ ] Store initializes with correct defaults (`preferredUnit: 'mg/dL'`, `onboardingCompleted: false`, etc.)
- [ ] After calling `useAppStore.getState().completeOnboarding()`, `onboardingCompleted` is `true`
- [ ] Kill and restart the app → `onboardingCompleted` is still `true` (persisted to AsyncStorage)
- [ ] `usePreferredUnit()` returns the correct value
- [ ] All actions update state correctly

---

## Dependencies
- **US-FE-01** (AsyncStorage installed) must be complete first.
