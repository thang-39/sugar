# SUGAR-10-FE-Zustand-Store

## Metadata

| Field | Value |
|---|---|
| **Phase** | 1-1 — Foundation |
| **Category** | Frontend |
| **User Stories (PRD)** | US-43 (unit preference), US-47 (onboarding), US-48 (skip onboarding) |
| **Status** | Not started |
| **Blocked by** | SUGAR-06-FE-Project-Scaffold (AsyncStorage dependency) |

---

## Context

The app needs a single, shared state container for app-wide data: user preferences, auth status, and sync metadata. Zustand is chosen because it is lightweight, works without Redux boilerplate, and has a `persist` middleware that integrates with AsyncStorage.

This store is the **source of truth** for ephemeral UI state and persisted preferences. Individual reading data lives in WatermelonDB, not here.

---

## User Story

> As a **user**, I want my preferences — like my chosen blood sugar unit — to be remembered after I close and reopen the app, so I never have to re-select them.

---

## Acceptance Criteria

### AC-1: Store created in `src/data/stores/useAppStore.ts`

Uses Zustand's `create()` with `persist` middleware and `createJSONStorage` for AsyncStorage.

### AC-2: State shape

```ts
// Persisted keys (survive app restarts)
preferredUnit: 'mg/dL' | 'mmol/L'   // default: 'mg/dL'
onboardingCompleted: boolean          // default: false
userId: string | null                // default: null
isLoggedIn: boolean                  // default: false
lastSyncedAt: number | null          // default: null

// Non-persisted keys (reset on restart)
syncStatus: 'synced' | 'syncing' | 'pending' | 'offline' // default: 'offline'
pendingCount: number                                            // default: 0
```

### AC-3: All actions implemented

- `setPreferredUnit(unit)`
- `completeOnboarding()`
- `setUserId(userId | null)`
- `login(userId)` — sets userId and isLoggedIn together
- `logout()` — clears userId, returns to guest mode
- `setSyncStatus(status)`
- `setPendingCount(count)`
- `setLastSyncedAt(timestamp | null)`

### AC-4: Persist key is `@sugar/appStore`

The AsyncStorage key is `@sugar/appStore`. This key is used to verify persistence in AC-5.

### AC-5: Persistence verified

- After calling `completeOnboarding()`, kill the app and relaunch
- `onboardingCompleted` is `true` — the onboarding screen does NOT show again
- Change `preferredUnit` to `mmol/L`, kill and relaunch — it is still `mmol/L`

### AC-6: Selector hooks exported

Convenience hooks for optimized re-renders:

- `usePreferredUnit()` → returns `preferredUnit`
- `useOnboardingCompleted()` → returns `onboardingCompleted`
- `useSyncStatus()` → returns `syncStatus`
- `useIsLoggedIn()` → returns `isLoggedIn`

These prevent unnecessary re-renders when only one piece of state is needed.

---

## Definition of Done

- [ ] Store initializes with correct defaults
- [ ] All actions update state correctly
- [ ] `completeOnboarding()` persists and survives app restart
- [ ] `preferredUnit` persists across restarts
- [ ] Selector hooks work correctly
- [ ] No TypeScript errors
- [ ] `zustand` is imported and configured correctly

---

## Notes

- `syncStatus` and `pendingCount` are **not persisted** — they are derived from network state and the database on app launch, so they must always be recalculated fresh
- The `persist` middleware with `partialize` ensures only intended keys are saved to AsyncStorage — not accidentally persisting `syncStatus`
- `createJSONStorage` is the recommended way to connect Zustand persist to AsyncStorage
